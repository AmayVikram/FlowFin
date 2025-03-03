document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const conversationList = document.getElementById('conversation-list');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const contextMenu = document.getElementById('context-menu');
    
    let currentConversationId = null;
    
    // Load user conversations from the server
    async function loadUserConversations() {
        try {
            console.log('Loading conversations');
            const response = await fetch('/api/conversations');
            const data = await response.json();
            
            if (data.conversations && data.conversations.length > 0) {
                renderConversationList(data.conversations);
                
                // Load the most recent conversation
                loadConversation(data.conversations[0]._id);
            } else {
                // No existing conversations, start a new one
                startNewConversation();
            }
        } catch (error) {
            console.log('Error loading conversations:', error);
            // Start a new conversation if we can't load existing ones
            startNewConversation();
        }
    }
    
    // Start a new conversation
    async function startNewConversation() {
        clearChatMessages();
        currentConversationId = null;
        
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'New Conversation'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Handle both response formats
                if (data.conversation) {
                    currentConversationId = data.conversation._id;
                } else if (data._id) {
                    // If the server returns the conversation directly
                    currentConversationId = data._id;
                } else {
                    console.error('Unexpected response format:', data);
                }
                
                console.log('Created conversation with ID:', currentConversationId);
            }
        } catch (error) {
            console.error('Error creating new conversation:', error);
        }
        
        // Add welcome message
        addBotMessage("Hello! I'm your financial planning assistant. How can I help you today?", false);
    }
    
    // Create a title from the first user message
    function createTitleFromMessage(message) {
        // Get first three words (or fewer if message is shorter)
        const words = message.trim().split(/\s+/);
        const firstThreeWords = words.slice(0, 3).join(' ');
        
        // Add ellipsis if message has more than three words
        return words.length > 3 ? `${firstThreeWords}...` : firstThreeWords;
    }
    
    // Render the list of past conversations
    function renderConversationList(conversations) {
        conversationList.innerHTML = '';
        
        // Add all conversations
        conversations.forEach(convo => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.id = convo._id;
            
            if (convo._id === currentConversationId) {
                item.classList.add('active');
            }
            
            // Format the date
            const date = new Date(convo.updatedAt || convo.createdAt).toLocaleDateString();
            
            item.innerHTML = `
                <div class="convo-title">${convo.title || 'New Conversation'}</div>
                <div class="convo-date">${date}</div>
            `;
            
            item.addEventListener('click', () => loadConversation(convo._id));
            
            // Add context menu on right-click
            item.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                showContextMenu(e, convo._id);
            });
            
            conversationList.appendChild(item);
        });
    }
    
    // Show context menu for conversation management
    function showContextMenu(e, conversationId) {
        // Position the menu
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        
        // Set current conversation ID for the menu actions
        contextMenu.dataset.id = conversationId;
        
        // Handle menu item clicks
        contextMenu.querySelector('.rename').onclick = function() {
            const newTitle = prompt('Enter new conversation title:');
            if (newTitle) {
                updateConversationTitle(conversationId, newTitle);
            }
            hideContextMenu();
        };
        
        contextMenu.querySelector('.delete').onclick = function() {
            if (confirm('Are you sure you want to delete this conversation?')) {
                deleteConversation(conversationId);
            }
            hideContextMenu();
        };
        
        // Hide menu when clicking elsewhere
        document.addEventListener('click', hideContextMenu);
    }
    
    // Hide context menu
    function hideContextMenu() {
        contextMenu.style.display = 'none';
        document.removeEventListener('click', hideContextMenu);
    }
    
    // Load a specific conversation
    async function loadConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const data = await response.json();
            
            if (data.conversation) {
                currentConversationId = conversationId;
                clearChatMessages();
                
                // Mark this conversation as active in the sidebar
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.id === conversationId) {
                        item.classList.add('active');
                    }
                });
                
                // Display all messages in this conversation
                data.conversation.messages.forEach(msg => {
                    if (msg.sender === 'user') {
                        addUserMessage(msg.content, false);
                    } else {
                        addBotMessage(msg.content, false);
                    }
                });
            }
        } catch (error) {
            console.log('Error loading conversation:', error);
            showError("Couldn't load the conversation. Please try again.");
        }
    }
    
    // Clear the chat messages area
    function clearChatMessages() {
        chatMessages.innerHTML = '';
    }
    
    // Add a user message to the chat
    function addUserMessage(text, save = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        if (save && currentConversationId) {
            saveMessage('user', text);
            
            // If this is a new conversation with default title, update the title
            // with the first three words of the user's first message
            updateConversationTitleIfNew(text);
        }
    }
    
    // Update the conversation title if it's still the default
    async function updateConversationTitleIfNew(message) {
        try {
            // Get the current conversation to check its title
            const response = await fetch(`/api/conversations/${currentConversationId}`);
            const data = await response.json();
            
            if (data.conversation && data.conversation.title === 'New Conversation') {
                // This is a new conversation, update the title
                const newTitle = createTitleFromMessage(message);
                updateConversationTitle(currentConversationId, newTitle);
            }
        } catch (error) {
            console.log('Error checking conversation title:', error);
        }
    }
    
    // Save a message to the conversation
    async function saveMessage(sender, content) {
        if (!currentConversationId) return;
        
        try {
            await fetch(`/api/conversations/${currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender,
                    content
                })
            });
        } catch (error) {
            console.log('Error saving message:', error);
        }
    }
    
    // Add a bot message to the chat with typing animation
    function addBotMessage(text, animate = true) {
        if (animate) {
            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            chatMessages.appendChild(typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Simulate typing delay and then show the message
            setTimeout(() => {
                chatMessages.removeChild(typingIndicator);
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message bot-message';
                
                // Simulate typing effect for the bot message
                const typingSpeed = 15; // milliseconds per character
                let i = 0;
                messageDiv.textContent = '';
                chatMessages.appendChild(messageDiv);
                
                const typeWriter = () => {
                    if (i < text.length) {
                        messageDiv.textContent += text.charAt(i);
                        i++;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        setTimeout(typeWriter, typingSpeed);
                    }
                };
                
                typeWriter();
                
                if (currentConversationId) {
                    saveMessage('ai', text);
                }
            }, 1000);
        } else {
            // Add message instantly without animation
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot-message';
            messageDiv.textContent = text;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    // Show an error message in the chat
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error-message';
        errorDiv.textContent = message;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Send a message to the server and get a response
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        
        // Clear input field
        userInput.value = '';
        
        // Add user message to chat
        addUserMessage(text);
        
        try {
            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            chatMessages.appendChild(typingIndicator);
            
            // Send message to server
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    conversationId: currentConversationId
                })
            });
            
            // Remove typing indicator
            if (typingIndicator.parentNode === chatMessages) {
                chatMessages.removeChild(typingIndicator);
            }
            
            if (!response.ok) {
                throw new Error('Failed to get response');
            }
            
            const data = await response.json();
            
            // Update current conversation ID if this is a new conversation
            if (!currentConversationId && data.conversationId) {
                currentConversationId = data.conversationId;
                
                // Refresh the conversation list to show the new conversation
                loadUserConversations();
            }
            
            // Display bot response
            addBotMessage(data.response);
        } catch (error) {
            console.log('Error sending message:', error);
            showError("I couldn't process your request. Please try again.");
        }
    }
    
    // Delete a conversation
    async function deleteConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Refresh conversations list
                loadUserConversations();
                
                // If we deleted the current conversation, start a new one
                if (conversationId === currentConversationId) {
                    startNewConversation();
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            showError("Couldn't delete the conversation. Please try again.");
        }
    }
    
    // Update conversation title
    async function updateConversationTitle(conversationId, newTitle) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newTitle })
            });
            
            if (response.ok) {
                // Refresh conversations list to show updated title
                loadUserConversations();
            }
        } catch (error) {
            console.log('Error updating conversation title:', error);
        }
    }
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    newChatBtn.addEventListener('click', startNewConversation);
    
    toggleSidebarBtn.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('collapsed');
    });
    
    // Initialize by loading user conversations
    loadUserConversations();
});