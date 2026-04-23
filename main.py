import pandas as pd
import pickle
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Union
import uvicorn

# ==============================
# SEPARATE MODEL LOADING
# ==============================
print("Loading model and data...")
df = pd.read_pickle('courses.pkl')

with open('embeddings.pkl', 'rb') as f:
    embeddings = pickle.load(f)

model = None

def get_model():
    global model
    if model is None:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('all-MiniLM-L6-v2')
    return model

# ==============================
# FASTAPI APP
# ==============================
app = FastAPI(title="Course Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

# ==============================
# PYDANTIC SCHEMAS
# ==============================
class RecommendRequest(BaseModel):
    interest: str
    price: Union[str, float]
    duration: float
    level: str

# ==============================
# RECOMMEND FUNCTION
# ==============================
import pandas as pd

def compute_quality_score(row, price_pref):
    score = 0
    price_pref_str = str(price_pref).lower()

    # Price relevance (conditional)
    if price_pref_str != "free":
        if row['price'] > 0:
            score += 2
    else:
        if row['price'] == 0:
            score += 1

    # Popularity (cap effect)
    if row['students'] > 1000:
        score += 2
    elif row['students'] > 200:
        score += 1

    # Duration (avoid ultra-short placeholders)
    if row['duration'] > 2:
        score += 1

    # Subject quality
    if row['subject'] != "":
        score += 1

    return score

def recommend_personalized(interest, price_pref, duration_pref, level_pref, top_n=5):
    model = get_model()
    interest = interest.lower()
    
    if isinstance(price_pref, (float, int)):
        price_pref = str(price_pref)
        
    level_pref = level_pref.lower()
    is_numeric_price = price_pref.lower() != "free"

    # Progressive Fallback Strategy
    fallbacks = [
        {"drop_level": False, "drop_duration": False, "drop_price": False, "drop_interest_str": False},
        {"drop_level": True,  "drop_duration": False, "drop_price": False, "drop_interest_str": False},
        {"drop_level": True,  "drop_duration": True,  "drop_price": False, "drop_interest_str": False},
        {"drop_level": True,  "drop_duration": True,  "drop_price": True,  "drop_interest_str": False},
        {"drop_level": True,  "drop_duration": True,  "drop_price": True,  "drop_interest_str": True},
    ]

    filtered_df = df.copy()

    for fb in fallbacks:
        f_df = df.copy()
        
        # 1. Interest String Filter
        if not fb["drop_interest_str"]:
            f_df = f_df[f_df['combined'].str.contains(interest, regex=False, na=False)]
            
        # 2. Price Filter
        if not fb["drop_price"]:
            if not is_numeric_price:
                f_df = f_df[f_df['price'] == 0]
            else:
                try:
                    max_price = float(price_pref)
                    f_df = f_df[f_df['price'] <= max_price]
                except:
                    pass
                    
        # 3. Duration Filter
        if not fb["drop_duration"]:
            f_df = f_df[f_df['duration'] <= duration_pref]
            
        # 4. Level Filter
        if not fb["drop_level"]:
            if level_pref != "all levels":
                f_df = f_df[f_df['level'].str.lower().str.contains(level_pref, regex=False, na=False)]

        if len(f_df) > 0:
            filtered_df = f_df
            break

    if len(filtered_df) == 0:
        return []

    # Semantic similarity
    interest_embedding = model.encode([interest])
    filtered_embeddings = embeddings[filtered_df.index]

    sim_scores = cosine_similarity(interest_embedding, filtered_embeddings)[0]

    filtered_df = filtered_df.copy()
    filtered_df['score'] = sim_scores

    # --- 1) SAFE NUMERIC HANDLING ---
    filtered_df['price'] = pd.to_numeric(filtered_df['price'], errors='coerce').fillna(0)
    filtered_df['students'] = pd.to_numeric(filtered_df['students'], errors='coerce').fillna(0)
    filtered_df['duration'] = pd.to_numeric(filtered_df['duration'], errors='coerce').fillna(0)
    
    # Clean subject
    filtered_df['subject'] = filtered_df['subject'].replace(["unknown", None], "").fillna("")

    # --- 2) IMPROVE QUALITY SCORE ---
    filtered_df['quality_score'] = filtered_df.apply(
        lambda r: compute_quality_score(r, price_pref), axis=1
    )

    # --- 3) NORMALIZE & COMBINE SCORES ---
    q_max = filtered_df['quality_score'].max()
    if q_max == 0:
        q_max = 1
    filtered_df['q_norm'] = filtered_df['quality_score'] / q_max

    filtered_df['final_score'] = 0.7 * filtered_df['score'] + 0.3 * filtered_df['q_norm']

    filtered_df = filtered_df.sort_values(by=['final_score'], ascending=False)

    # --- 4) LIGHT DIVERSITY (AVOID DUPLICATES) ---
    filtered_df = filtered_df.drop_duplicates(subset=['title'])
    
    filtered_df['title_key'] = filtered_df['title'].str.lower().str.replace(r'[^a-z0-9 ]', '', regex=True)
    filtered_df = filtered_df.drop_duplicates(subset=['title_key'])

    # --- 5) TWO-STAGE SELECTION ---
    top_results = filtered_df.head(top_n * 2)
    result_df = top_results.head(top_n)

    # --- 6) RETURN FIELDS ---
    cols = ['title', 'subject', 'level', 'rating', 'students', 'price', 'duration', 'relevanceScore']
    available_cols = [c for c in cols if c in result_df.columns]
    
    # The frontend looks for `relevanceScore` directly now, so let's optionally preserve the final_score as it.
    # But wait, original code didn't return 'score'. Let's stick strictly to what user asked:
    cols = ['title', 'subject', 'level', 'rating', 'students', 'price', 'duration']
    available_cols = [c for c in cols if c in result_df.columns]
    
    result = result_df[available_cols]

    return result.to_dict(orient='records')


# ==============================
# ROUTES
# ==============================
@app.get('/', response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post('/recommend')
async def recommend(req: RecommendRequest):
    results = recommend_personalized(
        req.interest,
        req.price,
        req.duration,
        req.level
    )
    return results

if __name__ == "__main__":
    print("Starting FastAPI App...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
