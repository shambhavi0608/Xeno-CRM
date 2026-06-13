import express from 'express';

const app = express();
app.use(express.json());

const PORT = 3001;

// GET /channel/health
app.get('/channel/health', (req, res) => {
  res.json({ status: 'ok', service: 'channel-simulation', port: PORT });
});

// Helper function to send status payload back to localhost:3000/api/callback
async function postStatus(campaignId: string, customerId: string, status: string) {
  try {
    const response = await fetch('http://localhost:3000/api/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, customerId, status })
    });
    if (!response.ok) {
      console.error(`[channelService] Error posting status ${status} for customer ${customerId}: ${response.statusText}`);
    }
  } catch (err: any) {
    console.error(`[channelService] Network error posting status ${status}:`, err.message);
  }
}

// POST /channel/send
app.post('/channel/send', (req, res) => {
  const { campaignId, channel, targetCustomers } = req.body;

  if (!campaignId || !targetCustomers || !Array.isArray(targetCustomers)) {
    return res.status(400).json({ error: 'Missing campaignId or targetCustomers' });
  }

  res.json({ status: 'accepted', message: `Queued simulation for ${targetCustomers.length} customers` });

  // Simulate delivery process asynchronously
  targetCustomers.forEach((cust: { id: string; name: string }) => {
    // 1. Sent status
    setTimeout(() => {
      postStatus(campaignId, cust.id, 'sent');
    }, Math.random() * 500 + 200);

    // 2. Delivery evaluation (~1500ms to 3000ms)
    const outcomeRoll = Math.random();

    setTimeout(() => {
      if (outcomeRoll < 0.04) {
        // 4% failed (Realistic 96% delivery rate between 92% and 99%)
        postStatus(campaignId, cust.id, 'failed');
      } else {
        // 96% delivered
        postStatus(campaignId, cust.id, 'delivered');

        // 3. Open Evaluation (~3500ms to 6000ms)
        if (outcomeRoll >= 0.10 && outcomeRoll < 0.35) {
          setTimeout(() => {
            postStatus(campaignId, cust.id, 'opened');

            // 4. Click Evaluation (~7000ms to 10000ms)
            const clickTrigger = Math.random();
            if (clickTrigger < 0.25) { // 25% of opened users click
              setTimeout(() => {
                postStatus(campaignId, cust.id, 'clicked');
              }, Math.random() * 3000 + 2000);
            }
          }, Math.random() * 2000 + 2000);
        }
      }
    }, Math.random() * 1500 + 1500);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Channel Simulation Service running on port ${PORT}`);
});
