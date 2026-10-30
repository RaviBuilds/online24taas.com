import { notFound } from 'next/navigation';

// Unmatched multi-segment URLs render the branded 404 inside the site layout (a bare app/not-found
// would have no layout). Status is still 404.
export default function Missing() {
  notFound();
}
