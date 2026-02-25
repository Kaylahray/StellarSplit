# Collaborative filtering for split suggestions
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class CollaborativeFilter:
    def __init__(self, user_split_matrix):
        self.user_split_matrix = user_split_matrix
        self.sim_matrix = cosine_similarity(user_split_matrix)

    def suggest_participants(self, user_id, top_n=3):
        user_idx = user_id
        sim_scores = self.sim_matrix[user_idx]
        top_users = np.argsort(sim_scores)[-top_n-1:-1][::-1]
        return top_users.tolist()

    def recommend_amounts(self, user_id):
        return np.mean(self.user_split_matrix[user_id])
