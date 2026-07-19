import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Generate a random offset. Assuming ~75,000 novels in DB.
    const randomOffset = Math.floor(Math.random() * 75000);
    const { data, error } = await supabase
      .from('urdu_novels')
      .select('id, Titles, Links')
      .range(randomOffset, randomOffset + 5)
      .limit(6);

    if (error) {
      console.error("Error fetching random novels:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: 'Failed to fetch random novels' }, { status: 500 });
  }
}
