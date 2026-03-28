const { MailSlurp } = require('mailslurp-client');
const fs = require('fs');
const path = require('path');

async function createInbox() {
    try {
        // Read API key from a.txt
        const apiKey = fs.readFileSync(path.join(__dirname, 'a.txt'), 'utf8').trim();
        
        // Initialize MailSlurp client
        const mailslurp = new MailSlurp({ apiKey });
        
        // Create an inbox
        console.log('Creating inbox...');
        const inbox = await mailslurp.createInbox();
        
        console.log('Inbox created successfully!');
        console.log('ID:', inbox.id);
        console.log('Email Address:', inbox.emailAddress);
    } catch (error) {
        console.error('Error creating inbox:', error.message);
        process.exit(1);
    }
}

createInbox();
