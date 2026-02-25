# Tests for AI split recommendation system
import numpy as np
from .collaborative import CollaborativeFilter
from .timeseries import SplitTimeSeries
from .classifier import PaymentClassifier
from .fairness import optimize_fairness

def test_collaborative():
    matrix = np.array([[10,20],[20,30],[30,40]])
    cf = CollaborativeFilter(matrix)
    assert isinstance(cf.suggest_participants(0), list)
    assert isinstance(cf.recommend_amounts(0), float)

def test_timeseries():
    history = [10, 20, 30, 40]
    ts = SplitTimeSeries(history)
    assert isinstance(ts.predict_next_split(), float)

def test_classifier():
    clf = PaymentClassifier()
    X = np.array([[1,2],[2,3],[3,4]])
    y = np.array([0,1,1])
    clf.train(X, y)
    assert clf.predict(X).shape[0] == 3

def test_fairness():
    scores = optimize_fairness(np.array([10, 20, 30]))
    assert np.all(scores <= 1)
