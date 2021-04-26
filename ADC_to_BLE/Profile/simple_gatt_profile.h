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
#ifndef SIMPLEGATTPROFILE_H
#define SIMPLEGATTPROFILE_H

#ifdef __cplusplus
extern "C"
{
#endif
/*******************************************************************************
 *                                CONSTANTS
 ******************************************************************************/
#include "profile_util.h"

/*******************************************************************************
 *                                CONSTANTS
 ******************************************************************************/
/* Characteristic Types - These must be listed in order that they appear
   in service */
//#define SP_CHAR1                     0x00
//#define SP_CHAR2                     0x01
//#define SP_CHAR3                     0x02
#define SP_AP_START                    0x00
#define SP_AP_AUDIO                    0x01

//#define SP_CHAR1_ID                  PROFILE_ID_CREATE(SP_CHAR1,PROFILE_VALUE)
//#define SP_CHAR2_ID                  PROFILE_ID_CREATE(SP_CHAR2,PROFILE_VALUE)
//#define SP_CHAR3_ID                  PROFILE_ID_CREATE(SP_CHAR3,PROFILE_VALUE)
#define SP_AP_START_ID              PROFILE_ID_CREATE(SP_AP_START,PROFILE_VALUE)
#define SP_AP_AUDIO_ID              PROFILE_ID_CREATE(SP_AP_AUDIO,PROFILE_VALUE)

/* Simple Profile Service UUID */
#define SIMPLEPROFILE_SERV_UUID             0x1108

/* Simple Profile Characteristic UUIDs */
//#define SIMPLEPROFILE_CHAR1_UUID            0xFFF1
//#define SIMPLEPROFILE_CHAR2_UUID            0xFFF2
//#define SIMPLEPROFILE_CHAR3_UUID            0xFFF3
#define AUDIOPROFILE_START_UUID                  0xB001
#define AUDIOPROFILE_AUDIO_UUID                  0x1112

/*******************************************************************************
 *                                  FUNCTIONS
 ******************************************************************************/
/*
 * SimpleProfile_AddService- Initializes the Simple GATT Profile service by
 *          GATT attributes with the GATT server.
 *
 * @param   services - services to add. This is a bit map and can
 *                     contain more than one service.
 */
extern uint32_t SimpleProfile_AddService(void);

/*
 * SimpleProfile_RegisterAppCBs - Registers the application callback function.
 *                    Only call this function once.
 *
 *    appCallbacks - pointer to application callbacks.
 */
extern uint32_t SimpleProfile_RegisterAppCB(BLEProfileCallbacks_t *callbacks);

/*
 * SimpleProfile_SetParameter - Set a Simple GATT Profile parameter.
 *
 *    param - Profile parameter ID
 *    len - length of data to right
 *    value - pointer to data to write.  This is dependent on
 *          the parameter ID and WILL be cast to the appropriate
 *          data type (example: data type of uint16 will be cast to
 *          uint16 pointer).
 */
extern uint32_t SimpleProfile_SetParameter(uint8 param, uint8 len, void *value);

/*
 * SimpleProfile_GetParameter - Get a Simple GATT Profile parameter.
 *
 *    param - Profile parameter ID
 *    value - pointer to data to write.  This is dependent on
 *          the parameter ID and WILL be cast to the appropriate
 *          data type (example: data type of uint16 will be cast to
 *          uint16 pointer).
 */
extern uint32_t SimpleProfile_GetParameter(uint8 param, void *value);

#ifdef __cplusplus
}
#endif

#endif /* SIMPLEGATTPROFILE_H */

