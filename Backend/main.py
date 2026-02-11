from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
app = FastAPI()

#global_variables
Selected_language = None 


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#dummy endpoint to get candidate overview, in real implementation we will fetch this data from db
@app.get("/candidate/overview")
def candidate_overview():
    return {
        "name": "Ali Khan",
        "phone": "03001234567",
        "email": "ali@example.com",
        "address": "Karachi, Pakistan"
    }

#getting selected lanuage from frontend and storing in global variable for now, later we can implement db storage
class LanguageSelection(BaseModel):
    language: str
@app.post("/candidate/language")
def set_candidate_language(selection: LanguageSelection):
    print("Selected language:", selection.language)
    Selected_language = selection.language 
   #db storage
    return {
        "status": "language received",
        "language": selection.language
    }