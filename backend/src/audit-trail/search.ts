// Elasticsearch integration for audit search
import { Client } from '@elastic/elasticsearch';

const client = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

export async function indexEvent(event: object) {
  await client.index({
    index: 'audit-trail',
    document: event,
  });
}

export async function searchEvents(query: object) {
  const { hits } = await client.search({
    index: 'audit-trail',
    query,
  });
  return hits.hits.map(hit => hit._source);
}
