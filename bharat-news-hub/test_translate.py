import requests, json, time

# Simulate a realistic article with ~20 text nodes
html = """
<div>
<h1>India Launches New Space Mission</h1>
<p>The Indian Space Research Organisation (ISRO) has announced its latest and most ambitious space mission yet.</p>
<p>The mission aims to explore the far side of the moon and collect soil samples from previously unexplored regions.</p>
<p>Scientists from across the country have been working on this project for over five years.</p>
<p>The rocket will carry a payload of advanced instruments designed to measure radiation levels and geological composition.</p>
<p>Prime Minister Narendra Modi congratulated the team and called it a proud moment for the nation.</p>
<p>The launch is scheduled for the third quarter of this year from the Satish Dhawan Space Centre.</p>
<p>International space agencies have expressed interest in collaborating with ISRO on future missions.</p>
<p>This mission represents a significant leap forward in India's space exploration capabilities.</p>
<p>The total budget for the project is estimated at approximately 800 crore rupees.</p>
<p>ISRO plans to livestream the launch event for millions of viewers worldwide.</p>
</div>
"""

start = time.time()
r = requests.post("http://localhost:8000/translate", json={"html_content": html, "target_lang": "tamil"}, timeout=300)
data = r.json()
elapsed = time.time() - start

print(f"Time: {elapsed:.1f}s")
print(f"Success: {data['success']}")
print(f"Engine: {data['engine']}")

with open("test_output.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("Output saved to test_output.json")
