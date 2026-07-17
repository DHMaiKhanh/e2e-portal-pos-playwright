import { faker } from './faker';

/**
 * Shapes mirroring the real (JSON-LD/Hydra) Volt POS `/staffs?...` API, captured
 * by inspecting live network traffic. The Orders staff filter panel is populated
 * from this endpoint, so mocking it makes the panel's contents deterministic.
 */

export interface MockStaff {
  id: string;
  nickname: string;
}

/** One entry inside the `/staffs?...` collection's `member` array. */
export const buildMockStaff = (overrides: Partial<MockStaff> = {}) => {
  const id = overrides.id ?? faker.string.uuid();
  return {
    '@id': `/staffs/${id}`,
    '@type': 'Staff',
    id,
    nickname: overrides.nickname ?? faker.person.firstName(),
    role: {
      '@id': `/roles/${faker.string.uuid()}`,
      '@type': 'Role',
      id: faker.string.uuid(),
      name: 'Staff',
      status: 'active',
    },
    staffCode: faker.number.int({ min: 1, max: 999 }),
    status: 'active',
    isAllowBooking: true,
  };
};

/** Wraps staff rows in the Hydra `Collection` envelope the endpoint returns. */
export const buildMockStaffsCollection = (member: ReturnType<typeof buildMockStaff>[]) => ({
  '@context': '/contexts/Staff',
  '@id': '/staffs',
  '@type': 'Collection',
  totalItems: member.length,
  member,
});
