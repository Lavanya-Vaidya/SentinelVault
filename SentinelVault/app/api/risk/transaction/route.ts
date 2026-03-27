import { NextRequest, NextResponse } from 'next/server';

const CRYPTO_ML_API_URL = process.env.CRYPTO_ML_API_URL || 'http://localhost:8000';

// Update to point to local crypto-ml directory (now inside security_vault)
const LOCAL_CRYPTO_ML_PATH = '../crypto-ml';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get individual address predictions for better analysis
    const [senderResponse, recipientResponse, transactionResponse] = await Promise.all([
      fetch(`${CRYPTO_ML_API_URL}/predict_address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: body.sender }),
      }),
      fetch(`${CRYPTO_ML_API_URL}/predict_address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: body.recipient }),
      }),
      fetch(`${CRYPTO_ML_API_URL}/predict_transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    ]);

    // Check all responses
    if (!transactionResponse.ok) {
      const errorData = await transactionResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to get transaction risk prediction' },
        { status: transactionResponse.status }
      );
    }

    const transactionData = await transactionResponse.json();
    
    // Get individual predictions (use fallback if they fail)
    let senderData = transactionData;
    let recipientData = transactionData;
    
    if (senderResponse.ok) {
      senderData = await senderResponse.json();
    }
    
    if (recipientResponse.ok) {
      recipientData = await recipientResponse.json();
    }
    
    // Transform the response to match the expected frontend structure
    const transformedResponse = {
      transaction: {
        sender: body.sender,
        recipient: body.recipient,
        amount_eth: body.amount_eth,
      },
      combined_risk: {
        risk_score: transactionData.risk_score || 0,
        risk_level: transactionData.risk_level || 'unknown',
        recommendation: getRecommendation(transactionData.risk_level || 'unknown'),
      },
      sender_risk: {
        address: body.sender,
        risk_score: senderData.risk_score || 0,
        risk_level: senderData.risk_level || 'unknown',
        is_fraud: senderData.is_fraud || false,
        confidence: senderData.confidence || 0,
        probabilities: senderData.probabilities || { legitimate: 0, fraud: 0 },
      },
      recipient_risk: {
        address: body.recipient,
        risk_score: recipientData.risk_score || 0,
        risk_level: recipientData.risk_level || 'unknown',
        is_fraud: recipientData.is_fraud || false,
        confidence: recipientData.confidence || 0,
        probabilities: recipientData.probabilities || { legitimate: 0, fraud: 0 },
      },
    };
    
    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error('Transaction risk prediction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getRecommendation(riskLevel: string): 'safe' | 'caution' | 'risky' {
  switch (riskLevel.toLowerCase()) {
    case 'low':
      return 'safe';
    case 'medium':
      return 'caution';
    case 'high':
      return 'risky';
    default:
      return 'caution';
  }
}
