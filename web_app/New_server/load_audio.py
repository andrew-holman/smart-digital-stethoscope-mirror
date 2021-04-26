import librosa
import sys
import json
import codecs
from tensorflow import keras
import numpy as np
import tensorflow as tf
import requests

# import librosa.display

audio_path = sys.argv[1]
r = requests.get(audio_path, allow_redirects=True)
open('data_file.wav', 'wb').write(r.content)

y, sr = librosa.load('data_file.wav', duration=4)
mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
mfccs = mfccs.reshape(1, mfccs.shape[0], mfccs.shape[1], 1)
data = mfccs.tolist()
# with open("data.json", "w") as f:
# json.dumps(data)
model = keras.models.load_model("heartbeat_disease_real_weights.h5");
result = model.predict(data);

# json.dump(data, codecs.open("data.json", 'w', encoding='utf-8'), separators=(',', ':'), sort_keys=True, indent=4) ### this saves the array in .json format
print(result)
# length = len(mfccs)
# i=0
# while(i < length):
#     print(mfccs[i])ssh -R 80:localhost:8080 dae01177-c45a-4675-9b1b-045ba923bdac@localhost.run
#     i+=1