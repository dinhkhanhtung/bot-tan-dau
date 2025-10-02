import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { objectType, objectId, relatedTypes = [] } = body;

    if (!objectType || !objectId) {
      return NextResponse.json(
        { error: 'objectType and objectId are required' },
        { status: 400 }
      );
    }

    const results: any = {};

    // Query related objects based on type
    for (const relatedType of relatedTypes) {
      let query = '';
      let params: any[] = [];

      switch (relatedType) {
        case 'users':
          if (objectType === 'listing') {
            query = `
              SELECT u.* FROM users u
              JOIN listings l ON u.id = l.user_id
              WHERE l.id = $1
            `;
            params = [objectId];
          }
          break;

        case 'listings':
          if (objectType === 'user') {
            query = 'SELECT * FROM listings WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'conversations':
          if (objectType === 'user') {
            query = `
              SELECT c.* FROM conversations c
              WHERE c.user1_id = $1 OR c.user2_id = $1
            `;
            params = [objectId];
          }
          break;

        case 'payments':
          if (objectType === 'user') {
            query = 'SELECT * FROM payments WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'ratings':
          if (objectType === 'user') {
            query = `
              SELECT r.* FROM ratings r
              WHERE r.reviewer_id = $1 OR r.reviewee_id = $1
            `;
            params = [objectId];
          }
          break;

        case 'notifications':
          if (objectType === 'user') {
            query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC';
            params = [objectId];
          }
          break;

        case 'events':
          if (objectType === 'user') {
            query = `
              SELECT e.* FROM events e
              WHERE e.organizer_id = $1 OR EXISTS (
                SELECT 1 FROM event_participants ep
                WHERE ep.event_id = e.id AND ep.user_id = $1
              )
            `;
            params = [objectId];
          }
          break;

        case 'ads':
          if (objectType === 'user') {
            query = 'SELECT * FROM ads WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'search_requests':
          if (objectType === 'user') {
            query = 'SELECT * FROM search_requests WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'referrals':
          if (objectType === 'user') {
            query = `
              SELECT r.* FROM referrals r
              WHERE r.referrer_id = $1 OR r.referred_id = $1
            `;
            params = [objectId];
          }
          break;
      }

      if (query) {
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: query,
          sql_params: params
        });

        if (error) {
          console.error(`Error querying ${relatedType}:`, error);
          results[relatedType] = [];
        } else {
          results[relatedType] = data || [];
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectType = searchParams.get('objectType');
    const objectId = searchParams.get('objectId');
    const relatedTypes = searchParams.get('relatedTypes')?.split(',').filter(Boolean) || [];

    if (!objectType || !objectId) {
      return NextResponse.json(
        { error: 'objectType and objectId parameters are required' },
        { status: 400 }
      );
    }

    const results: any = {};

    // Query related objects based on type
    for (const relatedType of relatedTypes) {
      let query = '';
      let params: any[] = [];

      switch (relatedType) {
        case 'users':
          if (objectType === 'listing') {
            query = `
              SELECT u.* FROM users u
              JOIN listings l ON u.id = l.user_id
              WHERE l.id = $1
            `;
            params = [objectId];
          }
          break;

        case 'listings':
          if (objectType === 'user') {
            query = 'SELECT * FROM listings WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'conversations':
          if (objectType === 'user') {
            query = `
              SELECT c.* FROM conversations c
              WHERE c.user1_id = $1 OR c.user2_id = $1
            `;
            params = [objectId];
          }
          break;

        case 'payments':
          if (objectType === 'user') {
            query = 'SELECT * FROM payments WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'ratings':
          if (objectType === 'user') {
            query = `
              SELECT r.* FROM ratings r
              WHERE r.reviewer_id = $1 OR r.reviewee_id = $1
            `;
            params = [objectId];
          }
          break;

        case 'notifications':
          if (objectType === 'user') {
            query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC';
            params = [objectId];
          }
          break;

        case 'events':
          if (objectType === 'user') {
            query = `
              SELECT e.* FROM events e
              WHERE e.organizer_id = $1 OR EXISTS (
                SELECT 1 FROM event_participants ep
                WHERE ep.event_id = e.id AND ep.user_id = $1
              )
            `;
            params = [objectId];
          }
          break;

        case 'ads':
          if (objectType === 'user') {
            query = 'SELECT * FROM ads WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'search_requests':
          if (objectType === 'user') {
            query = 'SELECT * FROM search_requests WHERE user_id = $1';
            params = [objectId];
          }
          break;

        case 'referrals':
          if (objectType === 'user') {
            query = `
              SELECT r.* FROM referrals r
              WHERE r.referrer_id = $1 OR r.referred_id = $1
            `;
            params = [objectId];
          }
          break;
      }

      if (query) {
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: query,
          sql_params: params
        });

        if (error) {
          console.error(`Error querying ${relatedType}:`, error);
          results[relatedType] = [];
        } else {
          results[relatedType] = data || [];
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
