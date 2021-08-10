// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TeamTypes, ThreadTypes, PostTypes, ChannelTypes} from 'mattermost-redux/action_types';
import deepFreeze from 'mattermost-redux/utils/deep_freeze';

import threadsReducer from './threads';

describe('threads', () => {
    test('RECEIVED_THREADS should update the state', () => {
        const state = deepFreeze({
            threadsInTeam: {},
            threads: {},
            counts: {},
        });

        const nextState = threadsReducer(state, {
            type: ThreadTypes.RECEIVED_THREADS,
            data: {
                team_id: 'a',
                threads: [
                    {id: 't1'},
                ],
                total: 3,
                total_unread_threads: 0,
                total_unread_mentions: 1,
            },
        });

        expect(nextState).not.toBe(state);
        expect(nextState.threads.t1).toEqual({
            id: 't1',
        });
        expect(nextState.counts.a).toEqual({
            total: 3,
            total_unread_threads: 0,
            total_unread_mentions: 1,
        });
        expect(nextState.threadsInTeam.a).toContain('t1');
    });
    test('ALL_TEAM_THREADS_READ should clear the counts', () => {
        const state = deepFreeze({
            threadsInTeam: {},
            threads: {},
            counts: {
                a: {
                    total: 3,
                    total_unread_threads: 0,
                    total_unread_mentions: 2,
                },
            },
        });
        const nextState2 = threadsReducer(state, {
            type: ThreadTypes.ALL_TEAM_THREADS_READ,
            data: {
                team_id: 'a',
            },
        });

        expect(nextState2).not.toBe(state);
        expect(nextState2.counts.a).toEqual({
            total: 3,
            total_unread_threads: 0,
            total_unread_mentions: 0,
        });
    });

    test('READ_CHANGED_THREAD should update the count for thread per channel', () => {
        const state = deepFreeze({
            threadsInTeam: {},
            threads: {},
            counts: {
                a: {
                    total: 3,
                    total_unread_threads: 1,
                    total_unread_mentions: 3,
                },
            },
        });
        const nextState2 = threadsReducer(state, {
            type: ThreadTypes.READ_CHANGED_THREAD,
            data: {
                teamId: 'a',
                prevUnreadMentions: 3,
                newUnreadMentions: 0,
                channelId: 'a',
            },
        });

        expect(nextState2).not.toBe(state);
        expect(nextState2.counts.a).toEqual({
            total: 3,
            total_unread_threads: 1,
            total_unread_mentions: 0,
        });

        const nextState3 = threadsReducer(nextState2, {
            type: ThreadTypes.READ_CHANGED_THREAD,
            data: {
                teamId: 'a',
                prevUnreadMentions: 0,
                newUnreadMentions: 3,
                channelId: 'a',
            },
        });

        expect(nextState3).not.toBe(nextState2);
        expect(nextState3.counts.a).toEqual({
            total: 3,
            total_unread_threads: 1,
            total_unread_mentions: 3,
        });
    });
    test('LEAVE_TEAM should clean the state', () => {
        const state = deepFreeze({
            threadsInTeam: {},
            threads: {},
            counts: {},
        });

        let nextState = threadsReducer(state, {
            type: ThreadTypes.RECEIVED_THREADS,
            data: {
                team_id: 'a',
                threads: [
                    {id: 't1'},
                ],
                total: 3,
                total_unread_threads: 0,
                total_unread_mentions: 1,
            },
        });

        expect(nextState).not.toBe(state);

        // leave team
        nextState = threadsReducer(state, {
            type: TeamTypes.LEAVE_TEAM,
            data: {
                id: 'a',
            },
        });

        expect(nextState.threads.t1).toBe(undefined);
        expect(nextState.counts.a).toBe(undefined);
        expect(nextState.threadsInTeam.a).toBe(undefined);
    });

    test('POST_REMOVED should remove the thread when root post', () => {
        const state = deepFreeze({
            threadsInTeam: {
                a: ['t1', 't2', 't3'],
            },
            threads: {
                t1: {
                    id: 't1',
                },
                t2: {
                    id: 't2',
                },
                t3: {
                    id: 't3',
                },
            },
            counts: {},
        });

        const nextState = threadsReducer(state, {
            type: PostTypes.POST_REMOVED,
            data: {id: 't2', root_id: ''},
        });

        expect(nextState).not.toBe(state);
        expect(nextState.threads.t2).toBe(undefined);
        expect(nextState.threadsInTeam.a).toEqual(['t1', 't3']);
    });

    test('POST_REMOVED should do nothing when not a root post', () => {
        const state = deepFreeze({
            threadsInTeam: {
                a: ['t1', 't2', 't3'],
            },
            threads: {
                t1: {
                    id: 't1',
                },
                t2: {
                    id: 't2',
                },
                t3: {
                    id: 't3',
                },
            },
            counts: {},
        });

        const nextState = threadsReducer(state, {
            type: PostTypes.POST_REMOVED,
            data: {id: 't2', root_id: 't1'},
        });

        expect(nextState).toBe(state);
        expect(nextState.threads.t2).toBe(state.threads.t2);
        expect(nextState.threadsInTeam.a).toEqual(['t1', 't2', 't3']);
    });

    test('POST_REMOVED should do nothing when post not exist', () => {
        const state = deepFreeze({
            threadsInTeam: {
                a: ['t1', 't2'],
            },
            threads: {
                t1: {
                    id: 't1',
                },
                t2: {
                    id: 't2',
                },
            },
            counts: {},
        });

        const nextState = threadsReducer(state, {
            type: PostTypes.POST_REMOVED,
            data: {id: 't3', root_id: ''},
        });

        expect(nextState).toBe(state);
        expect(nextState.threads.t2).toBe(state.threads.t2);
        expect(nextState.threadsInTeam.a).toEqual(['t1', 't2']);
    });
    test('LEAVE_CHANNEL should remove threads that belong to that channel', () => {
        const state = deepFreeze({
            threadsInTeam: {
                a: ['t1', 't2', 't3'],
                b: ['t4', 't5', 't6'],
            },
            threads: {
                t1: {
                    id: 't1',
                    unread_replies: 1,
                    unread_mentions: 0,
                    post: {
                        channel_id: 'ch2',
                    },
                },
                t2: {
                    id: 't2',
                    unread_replies: 1,
                    unread_mentions: 1,
                    post: {
                        channel_id: 'ch1',
                    },
                },
                t3: {
                    id: 't3',
                    unread_replies: 2,
                    unread_mentions: 1,
                    post: {
                        channel_id: 'ch1',
                    },
                },
                t4: {
                    id: 't4',
                    unread_replies: 1,
                    unread_mentions: 0,
                    post: {
                        channel_id: 'ch3',
                    },
                },
                t5: {
                    id: 't5',
                    unread_replies: 1,
                    unread_mentions: 1,
                    post: {
                        channel_id: 'ch4',
                    },
                },
                t6: {
                    id: 't6',
                    unread_replies: 0,
                    unread_mentions: 0,
                    post: {
                        channel_id: 'ch5',
                    },
                },
            },
            counts: {
                a: {
                    total: 3,
                    total_unread_threads: 3,
                    total_unread_mentions: 2,
                },
                b: {
                    total: 3,
                    total_unread_threads: 2,
                    total_unread_mentions: 0,
                },
            },
        });

        const nextState = threadsReducer(state, {
            type: ChannelTypes.LEAVE_CHANNEL,
            data: {id: 'ch1', team_id: 'a'},
        });

        expect(nextState).not.toBe(state);

        expect(nextState.threads).toEqual({
            t1: state.threads.t1,
            t4: state.threads.t4,
            t5: state.threads.t5,
            t6: state.threads.t6,
        });

        expect(nextState.threadsInTeam.a).toEqual(['t1']);

        expect(nextState.counts.a).toEqual({
            total: 1,
            total_unread_threads: 1,
            total_unread_mentions: 0,
        });

        expect(nextState.threadsInTeam.b).toBe(state.threadsInTeam.b);
        expect(nextState.counts.b).toBe(state.counts.b);
    });
});
