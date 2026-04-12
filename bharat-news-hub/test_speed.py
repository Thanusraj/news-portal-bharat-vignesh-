import time
import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
DEVICE = "cpu"

print(f"Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
ip = IndicProcessor(inference=True)

# Generate some dummy Indian news text nodes
input_sentences = [
    "The Indian Space Research Organisation (ISRO) has announced its latest and most ambitious space mission yet.",
    "The mission aims to explore the far side of the moon and collect soil samples from previously unexplored regions.",
    "Scientists from across the country have been working on this project for over five years.",
    "The rocket will carry a payload of advanced instruments designed to measure radiation levels and geological composition.",
    "Prime Minister Narendra Modi congratulated the team and called it a proud moment for the nation.",
    "The launch is scheduled for the third quarter of this year from the Satish Dhawan Space Centre.",
    "International space agencies have expressed interest in collaborating with ISRO on future missions.",
    "This mission represents a significant leap forward in India's space exploration capabilities.",
    "The total budget for the project is estimated at approximately 800 crore rupees.",
    "ISRO plans to livestream the launch event for millions of viewers worldwide.",
] * 2 # 20 sentences

def test_speed(model, batch_size):
    print(f"Testing batch_size={batch_size}...")
    start = time.time()
    
    for i in range(0, len(input_sentences), batch_size):
        batch = input_sentences[i:i + batch_size]
        batch_preprocessed = ip.preprocess_batch(batch, src_lang="eng_Latn", tgt_lang="tam_Taml")
        
        inputs = tokenizer(
            batch_preprocessed,
            truncation=True,
            padding="longest",
            return_tensors="pt",
            return_attention_mask=True,
        ).to(DEVICE)
        
        with torch.no_grad():
            generated_tokens = model.generate(
                **inputs,
                use_cache=False,
                min_length=0,
                max_length=256,
                num_beams=1,
                num_return_sequences=1,
            )
            
        decoded = tokenizer.batch_decode(
            generated_tokens,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        )
        postprocessed = ip.postprocess_batch(decoded, lang="tam_Taml")
    
    elapsed = time.time() - start
    print(f"-> bs={batch_size} took {elapsed:.2f}s")
    return elapsed


print("Loading float32 model...")
model_f32 = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, trust_remote_code=True).to(DEVICE).float()
model_f32.eval()

test_speed(model_f32, 8)
test_speed(model_f32, 4)
test_speed(model_f32, 2)
test_speed(model_f32, 1)

print("\nLoading bfloat16 model...")
try:
    model_bf16 = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME, trust_remote_code=True, torch_dtype=torch.bfloat16).to(DEVICE)
    model_bf16.eval()
    test_speed(model_bf16, 8)
    test_speed(model_bf16, 4)
except Exception as e:
    print("bfloat16 failed:", str(e))
