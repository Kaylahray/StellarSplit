# Payment likelihood classifier
from sklearn.ensemble import RandomForestClassifier

class PaymentClassifier:
    def __init__(self):
        self.model = RandomForestClassifier()

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return self.model.predict_proba(X)[:,1]
