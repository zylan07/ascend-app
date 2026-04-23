from flask import Flask, render_template, request, jsonify
import pandas as pd
import pickle
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

# ==============================
# LOAD FILES
# ==============================
df = pd.read_pickle('courses.pkl')
embeddings = pickle.load(open('embeddings.pkl', 'rb'))

model = SentenceTransformer('all-MiniLM-L6-v2')


# ==============================
# RECOMMEND FUNCTION
# ==============================
def recommend_personalized(interest, price_pref, duration_pref, level_pref, top_n=5):

    interest = interest.lower()
    level_pref = level_pref.lower()

    filtered_df = df.copy()

    # Filter by interest
    filtered_df = filtered_df[
        filtered_df['combined'].str.contains(interest)
    ]

    # Price filter
    if price_pref.lower() == "free":
        filtered_df = filtered_df[filtered_df['price'] == 0]
    else:
        try:
            max_price = float(price_pref)
            filtered_df = filtered_df[filtered_df['price'] <= max_price]
        except:
            pass

    # Duration filter
    filtered_df = filtered_df[
        filtered_df['duration'] <= duration_pref
    ]

    # Level filter
    filtered_df = filtered_df[
        filtered_df['level'].str.lower().str.contains(level_pref)
    ]

    if len(filtered_df) == 0:
        return []

    # Semantic similarity
    interest_embedding = model.encode([interest])
    filtered_embeddings = embeddings[filtered_df.index]

    sim_scores = cosine_similarity(interest_embedding, filtered_embeddings)[0]

    filtered_df = filtered_df.copy()
    filtered_df['score'] = sim_scores

    filtered_df = filtered_df.sort_values(by='score', ascending=False)

    result = filtered_df.head(top_n)[['title', 'features']]

    return result.to_dict(orient='records')


# ==============================
# ROUTES
# ==============================
@app.route('/')
def home():
    return render_template('index.html')


@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json

    interest = data['interest']
    price = data['price']
    duration = float(data['duration'])
    level = data['level']

    results = recommend_personalized(
        interest,
        price,
        duration,
        level
    )

    return jsonify(results)


# ==============================
# RUN APP
# ==============================
print("Starting Flask App...")
if __name__ == "__main__":
    app.run(debug=True)