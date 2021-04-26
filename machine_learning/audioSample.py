from IPython.display import Audio
import tensorflow as tf
import tensorflow_io as tfio
import matplotlib.pyplot as plt
import numpy as numpy

audio = tfio.audio.AudioIOTensor(
    '../audio_files/testAudio.mp3')

print(audio)

tensor = audio.to_tensor()

audio_slice = audio[100:]
numpyArr = numpy.array(audio_slice)
oneDArr = numpyArr[:, 0]
toSqueeze = tf.reshape(oneDArr, [len(oneDArr), 1])
audio_tensor = tf.squeeze(toSqueeze, axis=[-1])
print(audio_tensor)

Audio(audio_tensor.numpy(), rate=audio.rate.numpy())

plt.figure()
plt.plot(audio_tensor.numpy())
