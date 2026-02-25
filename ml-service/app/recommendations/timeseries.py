# Time series analysis for split prediction
import numpy as np
from statsmodels.tsa.arima.model import ARIMA

class SplitTimeSeries:
    def __init__(self, split_history):
        self.split_history = split_history

    def predict_next_split(self):
        model = ARIMA(self.split_history, order=(1,1,1))
        fit = model.fit()
        return fit.forecast()[0]
