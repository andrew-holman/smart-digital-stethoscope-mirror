/*
 * adc_read_queue.c
 *
 *  Created on: Apr 20, 2021
 *      Author: jdobo
 */


#include <stdlib.h>
#include <unistd.h>
#include "adc_read_queue.h"
#include <stdio.h>

int init_adc_reading_queue(adc_read_queue* arq){
    arq = malloc(sizeof(adc_read_queue));
    if(arq == NULL){
        return 0;
    }
    else{
        arq->head = NULL;
        arq->tail = NULL;
        arq->num_readings = 0;
        return 1;
    }
}

int queue_adc_read(adc_read_queue* arq, adc_read* readings, int num_reads){
    /*Create new adc_read and copy values from parameters*/
    adc_read* new_reading = malloc(sizeof(adc_read));
    new_reading->readings = malloc(sizeof(uint16_t) * num_reads);
    if(new_reading == NULL || new_reading->readings == NULL){
        return 0;
    }
    else{
        new_reading->num_reads = num_reads;
        int i;
        for(i = 0; i < num_reads; i++){
            (new_reading->readings)[i] = (readings->readings)[i];
        }

        /*Add new adc_read to queue*/
        if(arq->num_readings == 0){
            arq->head = new_reading;
            arq->num_readings++;
        }
        else if(arq->num_readings == 1){
            new_reading->next = arq->head;
            arq->tail = new_reading;
            arq->num_readings++;
        }
        else{
            new_reading->next = arq->tail;
            arq->tail = new_reading;
            arq->num_readings++;
        }
        return 1;
    }
}

adc_read* peek_head(adc_read_queue* arq){
    return arq->head;
}

adc_read* pop_head(adc_read_queue* arq){
    adc_read* old_head = arq->head;
    if(arq->num_readings > 1){
        adc_read* temp = arq->tail;
        while(temp->next != arq->head){
            temp = temp->next;
        }
        arq->head = temp;
    }
    else{
        arq->head = NULL;
    }
    arq->num_readings--;
    return old_head;
}

void free_adc_reading_queue(adc_read_queue* arq){
    if(arq->head != NULL && arq->tail == NULL){
        free(arq->head->readings);
        free(arq->head);
    }
    else if(arq->head != NULL && arq->tail != NULL){
        adc_read* temp;
        temp = arq->tail;
        while(temp != NULL){
            temp = temp->next;
            printf("freed node\n");
            free(arq->tail->readings);
            free(arq->tail);
            arq->tail = temp;
        }
    }

    free(arq);
}

int get_reading_count(adc_read_queue* arq){
    return arq->num_readings;
}
