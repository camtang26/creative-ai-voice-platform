// Script to clear cache via API

async function clearCache() {
    try {
        // First, let's check what's in the cache
        const statsResponse = await fetch('https://twilioel-production.up.railway.app/api/cache/stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('Cache stats before clearing:', JSON.stringify(stats, null, 2));
        } else {
            console.log('Failed to get cache stats:', statsResponse.status, statsResponse.statusText);
        }

        // Clear the cache
        const clearResponse = await fetch('https://twilioel-production.up.railway.app/api/cache/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (clearResponse.ok) {
            const result = await clearResponse.json();
            console.log('Cache cleared:', result);
        } else {
            console.error('Failed to clear cache:', clearResponse.status, clearResponse.statusText);
            const errorText = await clearResponse.text();
            console.error('Error response:', errorText);
        }

        // Wait a moment for cache to clear
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test the contacts API again
        console.log('\nFetching contacts after cache clear...');
        const contactsResponse = await fetch('https://twilioel-production.up.railway.app/api/db/contacts?limit=1');
        const contacts = await contactsResponse.json();
        console.log('Contacts after cache clear:', JSON.stringify(contacts, null, 2));
        
        // Check if transformation worked
        if (contacts.data && contacts.data.contacts && contacts.data.contacts[0]) {
            const firstContact = contacts.data.contacts[0];
            console.log('\nTransformation check:');
            console.log('- First contact has id?', !!firstContact.id);
            console.log('- First contact has _id?', !!firstContact._id);
            console.log('- id value:', firstContact.id);
            console.log('- _id value:', firstContact._id);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

clearCache();