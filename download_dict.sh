#!/bin/sh
DICT=cedict_1_0_ts_utf-8_mdbg.zip
wget https://www.mdbg.net/chinese/export/cedict/$DICT
unzip $DICT
rm $DICT
