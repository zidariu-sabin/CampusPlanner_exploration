import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
import matplotlib.pyplot as plt

print("tensorflow version:", tf.__version__)
print("keras version:", tf.keras.__version__)
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

IMG_SIZE = (224, 224)
BATCH = 32
PATH = os.path.expanduser("~/Personal/Facultate/an4/machine learning/CampusPlannerInfo/kaggle_FloorPlan_AsutoshPrad_notebook/datasets/CVC_FP")  # Update path
print("Folders in dataset:", os.listdir(PATH))
for folder in os.listdir(PATH):
    print(f"{folder}: {len(os.listdir(os.path.join(PATH, folder)))} images")