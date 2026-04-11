import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase } from '@/lib/supabase-auth-server';
import { createServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {

});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get or create Stripe customer
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || profile?.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await serviceClient
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?cancelled=true`,
  });

  return NextResponse.json({ url: session.url });
}
