#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
#include <stdint.h>

typedef struct adc_read{
    uint16_t* readings;
    int num_reads;
    struct adc_read* next;

}adc_read;

typedef struct adc_read_queue {
    adc_read * head, * tail;             // head and tail of the list
    int num_readings;                    // number of readings currently in queue
}adc_read_queue;


int queue_adc_read(adc_read_queue* arq, adc_read* readings, int num_reads);

adc_read* peek_head(adc_read_queue* arq);

adc_read* pop_head(adc_read_queue* arq);

int init_adc_reading_queue(adc_read_queue* arq);

void free_adc_reading_queue(adc_read_queue* arq);

int get_reading_count(adc_read_queue* arq);
