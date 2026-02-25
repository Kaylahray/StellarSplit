# API for split recommendations
from fastapi import APIRouter, Request
from .collaborative import CollaborativeFilter
from .timeseries import SplitTimeSeries
from .classifier import PaymentClassifier
from .fairness import optimize_fairness
import time

router = APIRouter()

@router.post('/recommend')
async def recommend(request: Request):
    start = time.time()
    data = await request.json()
    user_id = data['user_id']
    user_split_matrix = data['user_split_matrix']
    split_history = data['split_history']
    X = data['features']
    y = data['labels']

    cf = CollaborativeFilter(user_split_matrix)
    ts = SplitTimeSeries(split_history)
    clf = PaymentClassifier()
    clf.train(X, y)

    participants = cf.suggest_participants(user_id)
    amount = cf.recommend_amounts(user_id)
    next_split = ts.predict_next_split()
    payment_likelihood = clf.predict([X[-1]])[0]
    fairness = optimize_fairness([amount, next_split])

    duration = (time.time() - start) * 1000
    return {
        'participants': participants,
        'recommended_amount': amount,
        'next_split_prediction': next_split,
        'payment_likelihood': payment_likelihood,
        'fairness_score': fairness.tolist(),
        'duration_ms': duration
    }
