/*
 * Copyright (c) 2015-2018, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/*
 *  ======== adcBufContinuousSampling.c ========
 */
#include <stdint.h>
#include <stdio.h>
/* For usleep() */
#include <unistd.h>
#include <pthread.h>

#include <semaphore.h>

/* SAP/DriverLib Includes */
#include "simple_application_processor.h"
#include "Board.h"
#include "adc_read_queue.h"

/* Driver Header files */
#include <ti/drivers/adcbuf/ADCBufMSP432.h>
#include <ti/drivers/ADCBuf.h>
#include "Profile/simple_gatt_profile.h"
/* Display Header files */
#include <ti/display/Display.h>

/* Board Header file */
#include <ti/drivers/GPIO.h>

/************************************************************/
/* Minimum data payload is 27 bytes. With 16 bit readings,  */
/* we can fit floor(27/2) = 13 conversions per buffer       */
/************************************************************/
#define ADCBUFFERSIZE    (13)

uint16_t sampleBufferOne[ADCBUFFERSIZE];
uint16_t sampleBufferTwo[ADCBUFFERSIZE];
float voltageBuffer[ADCBUFFERSIZE];
uint32_t buffersCompletedCounter = 0;

extern volatile uint8_t start_flag;
extern volatile uint8_t audio_flag;

/* Display Driver Handle */
//Display_Handle displayOut;

/* ADCBuf semaphore */
sem_t adcbufSem;

pthread_mutex_t console_mutex;
pthread_mutex_t adc_read_queue_mutex;
adc_read_queue* arq_pointer;
adc_read* queue_buffer;

/* This function converts a differential buffer to signed microvolts*/
int_fast16_t convertAdjustedDifferential(ADCBuf_Handle handle,
    uint32_t adcChannel, void *adjustedSampleBuffer,
    float outputDifferentialBuffer[], uint_fast16_t sampleCount)
{
    uint32_t i;
    uint16_t *adjustedRawSampleBuf = (uint16_t *) adjustedSampleBuffer;

    static int32_t temp;
    ADCBufMSP432_HWAttrs const *hwAttrs = handle->hwAttrs;
    float refMicroVoltage = hwAttrs->channelSetting[adcChannel].refVoltage;
    float refVoltage = (refMicroVoltage/1000000.0);

    /* Converts the ADC result (14-bit) to a float with respect to refVoltage */
    for (i = 0; i < sampleCount; i++) {
        if (0x8000 & adjustedRawSampleBuf[i]){
            temp = (adjustedRawSampleBuf[i] >>2)| 0xFFFFC000;
            outputDifferentialBuffer[i] = (temp * (refVoltage / 0x2000));
        }
        else {
            outputDifferentialBuffer[i] = ((adjustedRawSampleBuf[i] >> 2) * refVoltage) / 0x2000;
        }
    }

    return ADCBuf_STATUS_SUCCESS;
}


/*
 * This function is called whenever a buffer is full.
 * The content of the buffer is then converted into human-readable format and
 * sent to the PC via UART.
 *
 */
void adcBufCallback(ADCBuf_Handle handle, ADCBuf_Conversion *conversion,
    void *completedADCBuffer, uint32_t completedChannel) {
    GPIO_toggle(Board_LED1);

    if(start_flag == 1 && audio_flag == 1){
        memcpy(queue_buffer->readings, (uint16_t*) completedADCBuffer, sizeof(uint16_t) * ADCBUFFERSIZE);
        pthread_mutex_lock(&adc_read_queue_mutex);
        queue_adc_read(arq_pointer, queue_buffer, ADCBUFFERSIZE);
        pthread_mutex_unlock(&adc_read_queue_mutex);
        sem_post(&adcbufSem);
    }

}

/*
 *  ======== mainThread ========
 */
void *mainThread(void *arg0)
{
    Display_Params displayParams;
    ADCBuf_Handle adcBuf;
    ADCBuf_Params adcBufParams;
    ADCBuf_Conversion continuousConversion;


    /* Call driver init functions */
    ADCBuf_init();
    GPIO_init();
    Display_init();

    if (pthread_mutex_init(&console_mutex, NULL) != 0) {
        printf("Console_mutex init has failed\n");
        while(1);
    }

    if (pthread_mutex_init(&adc_read_queue_mutex, NULL) != 0) {
        printf("Adc_read_queue_mutex init has failed\n");
        while(1);
    }

    arq_pointer = malloc(sizeof(adc_read_queue));
    init_adc_reading_queue(arq_pointer);
    queue_buffer = malloc(sizeof(adc_read));
    queue_buffer->readings = malloc(sizeof(uint16_t) * ADCBUFFERSIZE);
    queue_buffer->num_reads = ADCBUFFERSIZE;

    /* Configure & open Display driver */
    Display_Params_init(&displayParams);
    displayParams.lineClearMode = DISPLAY_CLEAR_BOTH;

    sem_init(&adcbufSem, 0, 0);

    /* Set up an ADCBuf peripheral in ADCBuf_RECURRENCE_MODE_CONTINUOUS */
    ADCBuf_Params_init(&adcBufParams);
    adcBufParams.callbackFxn = adcBufCallback;
    adcBufParams.recurrenceMode = ADCBuf_RECURRENCE_MODE_CONTINUOUS;
    adcBufParams.returnMode = ADCBuf_RETURN_MODE_CALLBACK;
    adcBufParams.samplingFrequency = 1000;
    adcBuf = ADCBuf_open(CONFIG_ADCBUF0, &adcBufParams);


    /* Configure the conversion struct */
    continuousConversion.arg = NULL;
    continuousConversion.adcChannel = CONFIG_ADCBUF0CHANNEL_0;
    continuousConversion.sampleBuffer = sampleBufferOne;
    continuousConversion.sampleBufferTwo = sampleBufferTwo;
    continuousConversion.samplesRequestedCount = ADCBUFFERSIZE;

    if (!adcBuf){
        /* AdcBuf did not open correctly. */
        while(1);
    }

    /* Start converting. */
    if (ADCBuf_convert(adcBuf, &continuousConversion, 1) !=
        ADCBuf_STATUS_SUCCESS) {
        /* Did not start conversion process correctly. */
        while(1);
    }


//    /* USED FOR DEBUGGING ONLY */
//    pthread_mutex_lock(&console_mutex);
//    Display_print0(displayOut, 0, 0,"--------- ADC to BLE Project ---------");
//    Display_printf(displayOut, 0, 0, "ADC thread set up, starting BLE thread\n");
//    pthread_mutex_unlock(&console_mutex);


    AP_createTask();

    /*
     * Go to sleep in the foreground thread forever. The data will be collected
     * and transfered in the background thread
     */
    while(1) {

        sleep(1000);

    }

}
