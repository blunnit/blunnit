import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {

});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status;

      const tier = status === 'active' ? 'paid' : 'free';

      await supabase
        .from('profiles')
        .update({
          tier,
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from('profiles')
        .update({
          tier: 'free',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
