################################################################################
# Automatically-generated file. Do not edit!
################################################################################

SHELL = cmd.exe

# Add inputs and outputs from these tool invocations to the build variables 
CMD_SRCS += \
../MSP_EXP432P401R_TIRTOS.cmd 

SYSCFG_SRCS += \
../adcBufDifferential.syscfg 

C_SRCS += \
../adcBufDifferential.c \
./syscfg/ti_drivers_config.c \
../main_tirtos.c 

GEN_FILES += \
./syscfg/ti_drivers_config.c 

GEN_MISC_DIRS += \
./syscfg/ 

C_DEPS += \
./adcBufDifferential.d \
./syscfg/ti_drivers_config.d \
./main_tirtos.d 

OBJS += \
./adcBufDifferential.obj \
./syscfg/ti_drivers_config.obj \
./main_tirtos.obj 

GEN_MISC_FILES += \
./syscfg/ti_drivers_config.h \
./syscfg/syscfg_c.rov.xs 

GEN_MISC_DIRS__QUOTED += \
"syscfg\" 

OBJS__QUOTED += \
"adcBufDifferential.obj" \
"syscfg\ti_drivers_config.obj" \
"main_tirtos.obj" 

GEN_MISC_FILES__QUOTED += \
"syscfg\ti_drivers_config.h" \
"syscfg\syscfg_c.rov.xs" 

C_DEPS__QUOTED += \
"adcBufDifferential.d" \
"syscfg\ti_drivers_config.d" \
"main_tirtos.d" 

GEN_FILES__QUOTED += \
"syscfg\ti_drivers_config.c" 

C_SRCS__QUOTED += \
"../adcBufDifferential.c" \
"./syscfg/ti_drivers_config.c" \
"../main_tirtos.c" 

SYSCFG_SRCS__QUOTED += \
"../adcBufDifferential.syscfg" 


