/* --COPYRIGHT--,BSD
 * Copyright (c) 2017, Texas Instruments Incorporated
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
 * --/COPYRIGHT--*/

/* Standard Includes */
#include <string.h>
#include <stdlib.h>
#include <stdbool.h>
#include <pthread.h>
#include <mqueue.h>
#include <semaphore.h>
#include <time.h>
#include <unistd.h>

/* TI-Driver Includes */
#include <ti/drivers/GPIO.h>

/* Local Includes */
#include "simple_application_processor.h"
#include "Profile/simple_gatt_profile.h"
#include "adc_read_queue.h"
#include "Board.h"
#include "platform.h"

/* SAP/DriverLib Includes */
#include <ti/sap/sap.h>
#include <ti/sbl/sbl.h>
#include <ti/sbl/sbl_image.h>

/* Used to pass messages between callbacks and the task */
static mqd_t apQueueRec;
static mqd_t apQueueSend;
extern sem_t adcbufSem;

/* Used for log messages */
//extern Display_Handle displayOut;
//extern pthread_mutex_t console_mutex;
extern pthread_mutex_t adc_read_queue_mutex;

/* Clock instances for internal periodic events. */
//static Timer_Handle timer0;

/* Task configuration */
static pthread_t apTask;
static pthread_t notifyTask;

/*Flags to indicate peer has authorized notifications*/
volatile uint8_t start_flag;
volatile uint8_t audio_flag;

/* SAP Parameters for opening serial port to SNP */
static SAP_Params sapParams;
static uint8_t snpDeviceName[] = {'S', 'i', 'm', 'p', 'l', 'e', ' ', 'A', 'P'};

/* GAP - SCAN RSP data (max size = 31 bytes) */
static uint8_t scanRspData[] =
{
    /* Complete Name */
    0xb,/* length of this data */
    SAP_GAP_ADTYPE_LOCAL_NAME_COMPLETE, 'M', 'S', 'P', '4', '3', '2', ' ',
    'S', 'A', 'P',

    /* Connection interval range */
    0x05, /* length of this data */
    0x12, /* GAP_ADTYPE_SLAVE_CONN_INTERVAL_RANGE, */
    LO_UINT16(DEFAULT_DESIRED_MIN_CONN_INTERVAL),
    HI_UINT16(DEFAULT_DESIRED_MIN_CONN_INTERVAL),
    LO_UINT16(DEFAULT_DESIRED_MAX_CONN_INTERVAL),
    HI_UINT16(DEFAULT_DESIRED_MAX_CONN_INTERVAL),
    0x02,       /* length of this data */
    0x0A,       /* GAP_ADTYPE_POWER_LEVEL, */
    0           /* 0dBm */
};

/* GAP - Advertisement data (max size = 31 bytes, though this is
   best kept short to conserve power while advertisting) */
static uint8_t advertData[] =
{
/* Flags; this sets the device to use limited discoverable
   mode (advertises for 30 seconds at a time) instead of general
   discoverable mode (advertises indefinitely) */
    0x02, /* length of this data */
    SAP_GAP_ADTYPE_FLAGS, DEFAULT_DISCOVERABLE_MODE
            | SAP_GAP_ADTYPE_FLAGS_BREDR_NOT_SUPPORTED,

    /* Manufacturer specific advertising data */
    0x06,
    0xFF,
    LO_UINT16(TI_COMPANY_ID),
    HI_UINT16(TI_COMPANY_ID),
    TI_ST_DEVICE_ID,
    TI_ST_KEY_DATA_ID, 0x00 /* Key state */
};

/* Connection Handle - only one device currently allowed to connect to SNP */
static uint16_t connHandle = AP_DEFAULT_CONN_HANDLE;

/* BD address of the NWP */
static char nwpstr[] = "NWP:  0xFFFFFFFFFFFF";
#define nwpstrIDX       8

/* BD address of peer device in connection */
static char peerstr[] = "Peer: 0xFFFFFFFFFFFF";
#define peerstrIDX       8

///* Characteristic 3 Update string */
static uint8_t audio_start = 0;

/* Characteristic 4 */
adc_read* adc_readings;
extern adc_read_queue* arq_pointer;

/*******************************************************************************
 *                         LOCAL FUNCTIONS
 ******************************************************************************/
static void AP_init(void);
static void *AP_taskFxn(void *arg0);
static void *AP_notifyTask(void *arg0);
static void AP_initServices(void);
static void AP_keyHandler(void);
static void AP_bslKeyHandler(void);
static void AP_asyncCB(uint8_t cmd1, void *pParams);
static void AP_processSNPEventCB(uint16_t event, snpEventParam_t *param);
static void AP_SPcccdCB(uint8_t charID, uint16_t value);
static BLEProfileCallbacks_t simpleCBs = {AP_SPcccdCB};

/*******************************************************************************
 *                        PUBLIC FUNCTIONS
 ******************************************************************************/
/*******************************************************************************
 * @fn      AP_createTask
 *
 * @brief   Task creation function for the Simple BLE Peripheral.
 *
 * @param   None.
 *
 * @return  None.
 ******************************************************************************/
void AP_createTask(void)
{
    pthread_attr_t pAttrs;
    struct sched_param priParam;
    int retc;
    int detachState;

    pthread_attr_init(&pAttrs);
    priParam.sched_priority = AP_TASK_PRIORITY;

    detachState = PTHREAD_CREATE_DETACHED;
    retc = pthread_attr_setdetachstate(&pAttrs, detachState);

    if (retc != 0)
    {
        while(1);
    }

    pthread_attr_setschedparam(&pAttrs, &priParam);

    retc |= pthread_attr_setstacksize(&pAttrs, AP_TASK_STACK_SIZE);

    if (retc != 0)
    {
        while(1);
    }

    /* Creating the two tasks */
    retc |= pthread_create(&apTask, &pAttrs, AP_taskFxn, NULL);
    retc |= pthread_create(&notifyTask, &pAttrs, AP_notifyTask, NULL);
//    printf("%d\n", retc);
    if (retc != 0)
    {
        while(1);
    }
}

/*******************************************************************************
 * @fn      AP_init
 *
 * @brief   Called during initialization and contains application
 *          specific initialization (ie. hardware initialization/setup,
 *          table initialization, power up notification, etc), and
 *          profile initialization/setup.
 *
 * @param   None.
 *
 * @return  None.
 *******************************************(**********************************/
static void AP_init(void)
{
//    Timer_Params params;
    struct mq_attr attr;

    /* Create RTOS Queue */
    attr.mq_flags = 0;
    attr.mq_maxmsg = 64;
    attr.mq_msgsize = sizeof(uint32_t);
    attr.mq_curmsgs = 0;

    apQueueRec = mq_open("SimpleAP", O_RDWR | O_CREAT, 0664, &attr);
    apQueueSend = mq_open("SimpleAP", O_RDWR | O_CREAT | O_NONBLOCK, 0664,
                          &attr);

    /* Register Key Handler */
    GPIO_setCallback(Board_BUTTON0, (GPIO_CallbackFxn) AP_keyHandler);
    GPIO_enableInt(Board_BUTTON0);

    GPIO_setCallback(Board_BUTTON1, (GPIO_CallbackFxn) AP_bslKeyHandler);
    GPIO_enableInt(Board_BUTTON1);


//    /* USED FOR DEBUGGING ONLY */
//    pthread_mutex_lock(&console_mutex);
//    Display_print0(displayOut, 0, 0, "Application Processor Initializing... ");
//    pthread_mutex_unlock(&console_mutex);

    /* Register to receive notifications from Simple Profile if characteristics
       have been written to */
    SimpleProfile_RegisterAppCB(&simpleCBs);
}

/*******************************************************************************
 * @fn      AP_taskFxn
 *
 * @brief   Application task entry point for the Simple BLE Peripheral.
 *
 * @param   a0, a1 - not used.
 *
 * @return  None.
 ******************************************************************************/
static void *AP_taskFxn(void *arg0)
{
    ap_States_t state = AP_RESET;
    struct timespec ts;
    uint8_t enableAdv = 1;
    uint8_t disableAdv = 0;
    uint32_t curEvent = 0;
    uint32_t prio = 0;
    uint8_t sblStatus;
    SBL_Params params;
    SBL_Image image;

    /* Initialize application */
    AP_init();

//            /* USED FOR DEBUGGING ONLY */
//    pthread_mutex_lock(&console_mutex);
//    Display_print0(displayOut, 0, 0, "Done!");
//    pthread_mutex_unlock(&console_mutex);

    /* Application main loop */
    while (1)
    {
        switch (state)
        {
        case AP_RESET:
        {
            /* Make sure CC26xx is not in BSL */
            GPIO_write(Board_RESET, Board_LED_OFF);
            GPIO_write(Board_MRDY, Board_LED_ON);

//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0, "CC2650 Not in BSL mode!");
//            pthread_mutex_unlock(&console_mutex);

            usleep(10000);

            GPIO_write(Board_RESET, Board_LED_ON);

            /* Initialize UART port parameters within SAP parameters */
            SAP_initParams(SAP_PORT_REMOTE_UART, &sapParams);

            sapParams.port.remote.mrdyPinID = Board_MRDY;
            sapParams.port.remote.srdyPinID = Board_SRDY;
            sapParams.port.remote.boardID = Board_UART1;

            /* Setup NP module */
            SAP_open(&sapParams);

            /* Register Application thread's callback to receive
                 asynchronous requests from the NP. */
            SAP_setAsyncCB(AP_asyncCB);

            /* Reset the NP, and await a power-up indication.
               Clear any pending power indications received prior to this
               reset call */
            clock_gettime(CLOCK_REALTIME, &ts);
            ts.tv_sec += 1;

            mq_timedreceive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                            &prio, &ts);

            SAP_reset();

            do
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if ((curEvent != AP_EVT_BSL_BUTTON) && (curEvent != AP_EVT_PUI))
                {
//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 1",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while ((curEvent != AP_EVT_BSL_BUTTON) && (curEvent != AP_EVT_PUI));

            if (curEvent == AP_EVT_BSL_BUTTON)
            {
                state = AP_SBL;
            }
            else if (curEvent == AP_EVT_PUI)
            {
                /* Read BD ADDR */
                SAP_setParam(SAP_PARAM_HCI, SNP_HCI_OPCODE_READ_BDADDR, 0,
                                NULL);

                /* Setup Services - Service creation is blocking so
                 * no need to pend */
                AP_initServices();

                state = AP_IDLE;
            }
        }
            break;
        case AP_START_ADV:
        {
            /* Turn on user LED to indicate advertising */
            GPIO_write(Board_LED0, Board_LED_ON);

//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0,"Starting advertisement... ");
//            pthread_mutex_unlock(&console_mutex);
            
            /* Setting Advertising Name */
            SAP_setServiceParam(SNP_GGS_SERV_ID, SNP_GGS_DEVICE_NAME_ATT,
                                   sizeof(snpDeviceName), snpDeviceName);

            /* Set advertising data. */
            SAP_setParam(SAP_PARAM_ADV, SAP_ADV_DATA_NOTCONN,
                    sizeof(advertData), advertData);

            /* Set scan response data. */
            SAP_setParam(SAP_PARAM_ADV, SAP_ADV_DATA_SCANRSP,
                    sizeof(scanRspData), scanRspData);

            /* Enable Advertising and await NP response */
            SAP_setParam(SAP_PARAM_ADV, SAP_ADV_STATE, 1, &enableAdv);

            do
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if (curEvent != AP_EVT_ADV_ENB)
                {
//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 2",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while (curEvent != AP_EVT_ADV_ENB);

//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0, "Done!");
//            Display_print0(displayOut, 0, 0,
//                    "Waiting for connection (or timeout)... ");
//            pthread_mutex_unlock(&console_mutex);

            /* Wait for connection or button press to cancel advertisement */
            clock_gettime(CLOCK_REALTIME, &ts);
            ts.tv_sec += 30;
            curEvent = 0;
            mq_timedreceive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                            &prio, &ts);

            if(curEvent == AP_EVT_CONN_EST)
            {
                state = AP_CONNECTED;
            }
            else
            {
                state = AP_CANCEL_ADV;
//                /* USED FOR DEBUGGING ONLY */
//                pthread_mutex_lock(&console_mutex);
//                Display_print0(displayOut, 0, 0,"Advertisement Timeout!");
//                pthread_mutex_unlock(&console_mutex);
            }
        }
            break;

        case AP_CONNECTED:
            /* Before connecting, NP will send the stop ADV message */
            do
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if (curEvent != AP_EVT_ADV_END)
                {
//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 3",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while (curEvent != AP_EVT_ADV_END);

            /* Update State and Characteristic values on LCD */
//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print1(displayOut, 0, 0,"Peer connected! (%s)", peerstr);
//            pthread_mutex_unlock(&console_mutex);

            /* Events that can happen during connection:
             *   - Client Disconnect
             */
            do                                                                                             //Send adc data here
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if (curEvent != AP_EVT_CONN_TERM)
                {
//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 4",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while (curEvent != AP_EVT_CONN_TERM);

            /* Client has disconnected from server */
            SAP_setParam(SAP_PARAM_CONN, SAP_CONN_STATE, sizeof(connHandle),
                    (uint8_t *) &connHandle);

            do
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if ((curEvent != AP_EVT_CONN_TERM)
                        && (curEvent != AP_EVT_ADV_ENB))
                {
//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 5",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while (curEvent != AP_EVT_CONN_TERM);

            state = AP_CANCEL_ADV;

            break;

        case AP_CANCEL_ADV:

//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0,"Advertisement has been canceled!");
//            pthread_mutex_unlock(&console_mutex);

            /* Cancel Advertisement */
            SAP_setParam(SAP_PARAM_ADV, SAP_ADV_STATE, 1, &disableAdv);

            do
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if (curEvent != AP_EVT_ADV_END)
                {

//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 6",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while (curEvent != AP_EVT_ADV_END);

            state = AP_IDLE;
            break;

        case AP_IDLE:
            /* Turn off user LED to indicate stop advertising */
            GPIO_write(Board_LED0, Board_LED_OFF);
//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0,"State set to idle.");
//            pthread_mutex_unlock(&console_mutex);

            /* Key Press triggers state change from idle */
            do
            {
                curEvent = 0;
                mq_receive(apQueueRec, (void*) &curEvent, sizeof(uint32_t),
                           &prio);

                if ((curEvent != AP_EVT_BUTTON_RIGHT)
                        && (curEvent != AP_EVT_BSL_BUTTON))
                {
//                    /* USED FOR DEBUGGING ONLY */
//                    pthread_mutex_lock(&console_mutex);
//                    Display_printf(displayOut, 0, 0,
//                                   "[bleThread] Warning! Unexpected Event %lu at spot 7",
//                                   curEvent);
//                    pthread_mutex_unlock(&console_mutex);
                }
            }
            while ((curEvent != AP_EVT_BUTTON_RIGHT)
                    && (curEvent != AP_EVT_BSL_BUTTON));

            if (curEvent == AP_EVT_BUTTON_RIGHT)
            {
                state = AP_START_ADV;
            }
            else if (curEvent == AP_EVT_BSL_BUTTON)
            {
                state = AP_SBL;
            }

            break;
        case AP_SBL:
        {
//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0,"Device being set into BSL mode.");
//            pthread_mutex_unlock(&console_mutex);

            /* Close NP so SBL can use serial port */
            SAP_close();

            /* Initialize SBL Params and open port to target device */
            SBL_initParams(&params);
            params.resetPinID = Board_RESET;
            params.blPinID = Board_MRDY;
            params.targetInterface = SBL_DEV_INTERFACE_UART;
            params.localInterfaceID = Board_UART1;
            SBL_open(&params);

            /* Reset target and force into SBL code */
            SBL_openTarget();

//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0,"Programming the CC26xx... ");
//            pthread_mutex_unlock(&console_mutex);

            /* Flash new image to target */
            image.imgType = SBL_IMAGE_TYPE_INT;
            image.imgInfoLocAddr = (uint32_t)&SNP_code[0];
            image.imgLocAddr = (uint32_t)&SNP_code[0];
            image.imgTargetAddr = SNP_IMAGE_START;
            sblStatus = SBL_writeImage(&image);

            if (sblStatus != SBL_SUCCESS)
            {

//                /* USED FOR DEBUGGING ONLY */
//                pthread_mutex_lock(&console_mutex);
//                Display_print0(displayOut, 0, 0,"Programming failed!");
//                pthread_mutex_unlock(&console_mutex);
            } else
            {
//                /* USED FOR DEBUGGING ONLY */
//                pthread_mutex_lock(&console_mutex);
//                Display_print0(displayOut, 0, 0,"Programming passed!");
//                pthread_mutex_unlock(&console_mutex);
            }
//            /* USED FOR DEBUGGING ONLY */
//            pthread_mutex_lock(&console_mutex);
//            Display_print0(displayOut, 0, 0,"Resetting device.");
//            pthread_mutex_unlock(&console_mutex);

            /* Reset target and exit SBL code */
            SBL_closeTarget();

            /* Close SBL port to target device */
            SBL_close();

            /* Regardless of successful write we must restart the SNP
               force reset */
            MCU_rebootDevice();
        }
            break;
        default:
            break;
        }
    }
}

/*******************************************************************************
 * @fn      AP_notifyTask
 *
 * @brief   Task that we will use for the notification service
 *
 * @param   a0, a1 - not used.
 *
 * @return  None.
 ******************************************************************************/
static void *AP_notifyTask(void *arg0)
{
//    sem_init(&notifySem, 1, 0);

    while(1)
    {
        sem_wait(&adcbufSem);
        pthread_mutex_lock(&adc_read_queue_mutex);
        adc_readings = pop_head(arq_pointer);
        pthread_mutex_unlock(&adc_read_queue_mutex);
        /* Set parameter value of char4. If notifications or indications have
           been enabled, the profile will send them. */
        SimpleProfile_SetParameter(SP_AP_AUDIO_ID, sizeof(adc_readings) + (adc_readings->num_reads * sizeof(uint16_t)), adc_readings);
    }
}

/*******************************************************************************
 * @fn      AP_initServices
 *
 * @brief   Configure SNP and register services.
 *
 * @param   None.
 *
 * @return  None.
 ******************************************************************************/
static void AP_initServices(void)
{
    SimpleProfile_SetParameter(SP_AP_START_ID, sizeof(uint8_t), &audio_start);
    SimpleProfile_SetParameter(SP_AP_AUDIO_ID, sizeof(adc_readings) + (adc_readings->num_reads * sizeof(uint16_t)), adc_readings);

    /* Add the SimpleProfile Service to the SNP. */
    SimpleProfile_AddService();
    SAP_registerEventCB(AP_processSNPEventCB, 0xFFFF);
}

/*
 * This is a callback operating in the NPI task.
 * These are events this application has registered for.
 */
static void AP_processSNPEventCB(uint16_t event, snpEventParam_t *param)
{
    uint32_t eventPend;

    switch (event)
    {
    case SNP_CONN_EST_EVT:
    {
        snpConnEstEvt_t * connEstEvt = (snpConnEstEvt_t *) param;

        /* Update Peer Addr String */
        connHandle = connEstEvt->connHandle;
        ProfileUtil_convertBdAddr2Str(&peerstr[peerstrIDX], connEstEvt->pAddr);

        /* Notify state machine of established connection */
        eventPend = AP_EVT_CONN_EST;
        mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
    }
        break;

    case SNP_CONN_TERM_EVT:
    {
        connHandle = AP_DEFAULT_CONN_HANDLE;
        
        /* Notify state machine of disconnection event */
        eventPend = AP_EVT_CONN_TERM;
        mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
    }
        break;

    case SNP_ADV_STARTED_EVT:
    {
        snpAdvStatusEvt_t *advEvt = (snpAdvStatusEvt_t *) param;
        if (advEvt->status == SNP_SUCCESS)
        {
            /* Notify state machine of Advertisement Enabled */
            eventPend = AP_EVT_ADV_ENB;
            mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
        }
        else
        {
            eventPend = AP_ERROR;
            mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
        }
    }
        break;

    case SNP_ADV_ENDED_EVT:
    {
        snpAdvStatusEvt_t *advEvt = (snpAdvStatusEvt_t *) param;
        if (advEvt->status == SNP_SUCCESS)
        {
            /* Notify state machine of Advertisement Disabled */
            eventPend = AP_EVT_ADV_END;
            mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
        }
    }
        break;

    default:
        break;
    }
}

/*******************************************************************************
 * This is a callback operating in the NPI task.
 * These are Asynchronous indications.
 ******************************************************************************/
static void AP_asyncCB(uint8_t cmd1, void *pParams)
{
    uint32_t eventPend;

    switch (SNP_GET_OPCODE_HDR_CMD1(cmd1))
    {
    case SNP_DEVICE_GRP:
    {
        switch (cmd1)
        {
        case SNP_POWER_UP_IND:
            /* Notify state machine of Power Up Indication */
            eventPend = AP_EVT_PUI;
            mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
            break;

        case SNP_HCI_CMD_RSP:
        {
            snpHciCmdRsp_t *hciRsp = (snpHciCmdRsp_t *) pParams;
            switch (hciRsp->opcode)
            {
            case SNP_HCI_OPCODE_READ_BDADDR:
                /* Update NWP Addr String */
                ProfileUtil_convertBdAddr2Str(&nwpstr[nwpstrIDX],
                        hciRsp->pData);
                break;
            default:
                break;
            }
        }
            break;

        case SNP_EVENT_IND:
            break;

        default:
            break;
        }
    }
        break;

    default:
        break;
    }
}

/*******************************************************************************
 * @fn      AP_bslKeyHandler
 *
 * @brief   event handler function to notify the app to program the SNP
 *
 * @param   none
 *
 * @return  none
 ******************************************************************************/
void AP_bslKeyHandler(void)
{
    uint32_t eventPend;
    uint32_t delayDebounce = 0;

    GPIO_disableInt (Board_BUTTON1);

    /* Delay for switch debounce */
    for (delayDebounce = 0; delayDebounce < 20000; delayDebounce++)
        ;

    GPIO_clearInt(Board_BUTTON1);
    GPIO_enableInt(Board_BUTTON1);

    GPIO_toggle (Board_LED1);

    eventPend = AP_EVT_BSL_BUTTON;
    mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
}

/*******************************************************************************
 * @fn      AP_keyHandler
 *
 * @brief   Key event handler function
 *
 * @param   none
 *
 * @return  none
 ******************************************************************************/
void AP_keyHandler(void)
{
    uint32_t eventPend;
    uint32_t ii;

    GPIO_disableInt (Board_BUTTON0);

    /* Delay for switch debounce */
    for(ii=0;ii<20000;ii++);

    GPIO_clearInt(Board_BUTTON0);
    GPIO_enableInt(Board_BUTTON0);

    eventPend = AP_EVT_BUTTON_RIGHT;
    mq_send(apQueueSend, (void*)&eventPend, sizeof(uint32_t), 1);
}

static void AP_SPcccdCB(uint8_t charID, uint16_t value)
{
    switch (PROFILE_ID_CHAR(charID))
    {
    case SP_AP_START:
        switch (PROFILE_ID_CHARTYPE(charID))
        {
        case PROFILE_CCCD:
            /* If indication or notification flags are set start periodic
             clock that will write to characteristic 4 */
            if (value
                  & (SNP_GATT_CLIENT_CFG_NOTIFY | SNP_GATT_CLIENT_CFG_INDICATE))
            {
                start_flag = 1;
            } else
            {
                /* Flags are not set so make sure clock has stopped and clear
                 appropriate fields of LCD */
            }
            break;

        default:
            /* Should not receive other types */
            break;
        }
        break;
    case SP_AP_AUDIO:
        switch (PROFILE_ID_CHARTYPE(charID))
        {
        case PROFILE_CCCD:
            /* If indication or notification flags are set start periodic
             clock that will write to characteristic 4 */
            if (value
                  & (SNP_GATT_CLIENT_CFG_NOTIFY | SNP_GATT_CLIENT_CFG_INDICATE))
            {
                audio_flag = 1;
            } else
            {
                /* Flags are not set so make sure clock has stopped and clear
                 appropriate fields of LCD */
            }
            break;

        default:
            /* Should not receive other types */
            break;
        }
        break;

    default:
        break;
    }
}
