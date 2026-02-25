# Fairness optimization for splits
import numpy as np

def optimize_fairness(amounts):
    mean = np.mean(amounts)
    fairness_scores = 1 - np.abs(amounts - mean) / mean
    return fairness_scores
