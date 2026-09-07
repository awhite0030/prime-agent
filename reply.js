const fs = require('fs');
const data = [{
    "comment_id": "5568560563",
    "reply": "Acknowledged."
}];
fs.writeFileSync('reply.json', JSON.stringify(data));
