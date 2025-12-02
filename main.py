import tensorflow as tf
import tensorflow.keras as keras

print("tensorflow version:", tf.__version__)
print("keras version:", keras.__version__)
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))