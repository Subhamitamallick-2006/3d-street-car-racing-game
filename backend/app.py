from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

game_data = {"high_score": 0}

@app.route('/api/score', methods=['POST'])
def save_score():
    data = request.json
    score = data.get('score', 0)
    if score > game_data['high_score']:
        game_data['high_score'] = score
    return jsonify({"status": "success", "high_score": game_data['high_score']})

@app.route('/api/score', methods=['GET'])
def get_score():
    return jsonify(game_data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)