import * as firebase from 'firebase';
import * as firebaseConfig from '../../firebase.config';
import * as moment from 'moment';
import Vue from 'vue';
import Vuex from 'vuex';
import datePicker from 'vue-bootstrap-datetimepicker';
import { Solve } from '../modules/Models';
import * as Stats from '../modules/Statistics';
import * as Mutations from './MutationTypes';
import * as Actions from './ActionTypes';
let ScramblerWorker = require('worker-loader?name=GenerateScramblerWorker.js!../workers/GenerateScramblerWorker.js');

let prevRefs = {};

function connectRef(refName, ref, eventType, callback) {
    prevRefs[refName] = ref;
    ref.on(eventType, callback);
}

function disconnectRef(refName) {
    if (prevRefs[refName]) {
        prevRefs[refName].off();
        delete prevRefs[refName];
    }
}

function disconnectAllRefs() {
    Object.keys(prevRefs).forEach(key => prevRefs[key].off());
    prevRefs = {};
}

const state = {
    activeView: 'timer',
    scramblerWorker: new ScramblerWorker(),
    scramble: {
        text: 'Generating scramble...',
        svg: null
    },
    puzzles: null,
    userId: null,
    options: {
        showTimer: true,
        timerTrigger: 'spacebar'
    },
    sessionId: null,
    sessionDate: null,
    activePuzzle: 333,
    activeCategory: 'default',
    solves: [],
    sessionStats: null,
    allSessions: null,
    allStats: null
};

const getters = {
    puzzlesRef() {
        return firebase.database().ref('/puzzles');
    },
    optionsRef() {
        return firebase.database().ref(`/users/${state.userId}/options`);
    },
    currentSessionIdRef() {
        return firebase.database().ref(`/users/${state.userId}/currentSessionId`);
    },
    currentPuzzleRef() {
        return firebase.database().ref(`/users/${state.userId}/currentPuzzle`);
    },
    sessionsRef() {
        return firebase.database().ref(`/users/${state.userId}/sessions`);
    },
    currentSessionRef() {
        return firebase.database().ref(`/users/${state.userId}/sessions/${state.sessionId}`);
    },
    solvesRef() {
        return firebase.database().ref(`/solves/${state.userId}/${state.activePuzzle}/${state.activeCategory}`);
    },
    statsRef() {
        return firebase.database().ref(`/stats/${state.userId}/${state.activePuzzle}/${state.activeCategory}`);
    },
    sessionStatsRef () {
        return firebase.database().ref(`/stats/${state.userId}/${state.activePuzzle}/${state.activeCategory}/${state.sessionId}`);
    }
};

const mutations = {
    [Mutations.RECEIVE_USER_ID] (state, userId) {
        state.userId = userId;
    },
    [Mutations.RECEIVE_SESSION_ID] (state, sessionId) {
        state.sessionId = sessionId;
    },
    [Mutations.RECEIVE_PUZZLES] (state, puzzles) {
        state.puzzles = puzzles;
    },
    [Mutations.RECEIVE_SESSION_DATE] (state, payload) {
        state.sessionDate = payload.moment;
    },
    [Mutations.SET_ACTIVE_VIEW] (state, newView) {
        state.activeView = newView;
    },
    [Mutations.RECEIVE_ACTIVE_PUZZLE] (state, payload) {
        state.activePuzzle = payload.puzzle;
        state.activeCategory = payload.category;
    },
    [Mutations.RECEIVE_SCRAMBLE] (state, scramble) {
        state.scramble = scramble;
    },
    [Mutations.SET_OPTION_SHOWTIMER] (state, showTimer) {
        state.options.showTimer = showTimer;
    },
    [Mutations.SET_OPTION_TIMERTRIGGER] (state, timerTrigger) {
        state.options.timerTrigger = timerTrigger;
    },
    [Mutations.CLEAR_SOLVES] (state) {
        state.solves = [];
    },
    [Mutations.ADD_SOLVE] (state, solve) {
        state.solves.unshift(solve);
    },
    [Mutations.UPDATE_SOLVE] (state, payload) {
        Vue.set(state.solves, state.solves.findIndex(solve => solve.uid === payload.uid), payload.solve);
    },
    [Mutations.DELETE_SOLVE] (state, solveId) {
        state.solves.splice(state.solves.findIndex(solve => solve.uid = solveId), 1);
    },
    [Mutations.RECEIVE_SESSION_STATS] (state, stats) {
        state.sessionStats = stats;
    },
    [Mutations.RECEIVE_ALL_SESSIONS] (state, sessions) {
        state.allSessions = sessions;
    },
    [Mutations.RECEIVE_ALL_STATS] (state, stats) {
        state.allStats = stats;
    }
};

const actions = {
    [Actions.SET_OPTIONS] (context, payload) {
        context.getters.optionsRef.set(payload);
    },
    [Actions.SET_ACTIVE_PUZZLE] (context, payload) {
        context.getters.currentPuzzleRef.set({ puzzle: payload.puzzle, category: payload.category });
    },
    [Actions.UPDATE_SESSION_DATE] (context, payload) {
        context.getters.currentSessionRef.update({
            date: payload.moment.format('M/D/YYYY'),
            timestamp: payload.moment.valueOf()
        })
    },
    [Actions.REQUEST_SCRAMBLE] (context) {
        context.commit(Mutations.RECEIVE_SCRAMBLE, { text: null, svg: null });
        context.state.scramblerWorker.postMessage({
            scrambler: context.state.puzzles[context.state.activePuzzle].categories[context.state.activeCategory].scrambler
        })
    },
    [Actions.CHECK_SESSION] (context) {
        return new Promise((resolve, reject) => {
            if (!context.state.sessionId) {
                const date = moment().utc().dayOfYear(moment().dayOfYear()).startOf('day');
                const newSessionRef = context.getters.sessionsRef.push();

                context.getters.currentSessionIdRef.set(newSessionRef.key).then(() => {
                    newSessionRef.set({
                        date: date.format('M/D/YYYY'),
                        timestamp: date.valueOf()
                    });

                    resolve();
                });
            } else {
                resolve();
            }
        });
    },
    [Actions.CLOSE_SESSION] (context) {
        context.getters.currentSessionIdRef.set(null);
    },
    [Actions.STORE_SOLVE] (context, delta) {
        context.dispatch(Actions.CHECK_SESSION).then(() => {
            context.getters.solvesRef.push().set({
                sessionId: context.state.sessionId,
                time: delta,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                scramble: context.state.scramble.text,
                penalty: ''
            }).then(() => context.dispatch(Actions.UPDATE_STATS));

            context.dispatch(Actions.REQUEST_SCRAMBLE);
        });
    },
    [Actions.SET_PENALTY] (context, update) {
        const newPenalty = (update.solve.penalty === update.penalty) ? '' : update.penalty;
        context.getters.solvesRef.child(update.solve.uid).update({penalty : newPenalty}).then(() => context.dispatch(Actions.UPDATE_STATS));
    },
    [Actions.DELETE_SOLVE] (context, solveId) {
        context.getters.solvesRef.child(solveId).remove().then(() => context.dispatch(Actions.UPDATE_STATS));
    },
    [Actions.UPDATE_STATS] (context) {
        if (context.state.solves.length === 0) {
            context.getters.sessionStatsRef.remove();
            context.commit(Mutations.RECEIVE_SESSION_STATS, null);
        } else {
            context.getters.sessionStatsRef.update({
                mean: Stats.mean(context.state.solves),
                count: Stats.count(context.state.solves),
                best: Stats.best(context.state.solves),
                worst: Stats.worst(context.state.solves),
                stdDev: Stats.stdDev(context.state.solves),
                mo3: Stats.mo3(context.state.solves),
                ao5: Stats.ao5(context.state.solves),
                ao12: Stats.ao12(context.state.solves),
                ao50: Stats.ao50(context.state.solves),
                ao100: Stats.ao100(context.state.solves),
                bestMo3: Stats.bestMo3(context.state.solves),
                bestAo5: Stats.bestAo5(context.state.solves),
                bestAo12: Stats.bestAo12(context.state.solves),
                bestAo50: Stats.bestAo50(context.state.solves),
                bestAo100: Stats.bestAo100(context.state.solves)
            });
        }
    }
};

const plugins = [
    store => firebase.auth().onAuthStateChanged(user => {
        store.commit(Mutations.RECEIVE_USER_ID, user ? user.uid : null);
    }),
    store => store.state.scramblerWorker.addEventListener('message', event => {
        if (event.data === null) {
            store.commit(Mutations.RECEIVE_SCRAMBLE, { text: 'No valid scrambler for this puzzle', svg: null });
        } else {
            store.commit(Mutations.RECEIVE_SCRAMBLE, { text: event.data.scramble, svg: event.data.svg });
        }
    }),
    store => store.getters.puzzlesRef.on('value', snapshot => {
        store.commit(Mutations.RECEIVE_PUZZLES, snapshot.val());
    }),
    store => store.subscribe((mutation, state) => {
        if (mutation.type === Mutations.RECEIVE_USER_ID) {
            disconnectAllRefs();

            if (state.userId) {
                connectRef('optionsRef', store.getters.optionsRef, 'value', snapshot => {
                    store.commit(Mutations.SET_OPTION_SHOWTIMER, snapshot.val().showTimer);
                    store.commit(Mutations.SET_OPTION_TIMERTRIGGER, snapshot.val().timerTrigger);
                });

                connectRef('currentSessionIdRef', store.getters.currentSessionIdRef, 'value', snapshot => {
                    store.commit(Mutations.RECEIVE_SESSION_ID, snapshot.val());
                    store.commit(Mutations.RECEIVE_ACTIVE_PUZZLE, { puzzle: state.activePuzzle, category: state.activeCategory });
                });

                connectRef('currentPuzzleRef', store.getters.currentPuzzleRef, 'value', snapshot => {
                    store.commit(Mutations.RECEIVE_ACTIVE_PUZZLE, snapshot.val());
                });
            }
        }
    }),
    store => store.subscribe((mutation, state) => {
        if (mutation.type === Mutations.RECEIVE_SESSION_ID) {
            disconnectRef('sessionRef');

            if (state.sessionId) {
                connectRef('sessionRef', store.getters.currentSessionRef, 'value', snapshot => {
                    store.commit(Mutations.RECEIVE_SESSION_DATE, { moment: moment(snapshot.val().timestamp).utc() });
                })
            }
        }
    }),
    store => store.subscribe((mutation, state) => {
        if (mutation.type === Mutations.RECEIVE_ACTIVE_PUZZLE) {
            disconnectRef('solvesRef');
            disconnectRef('sessionStatsRef');
            disconnectRef('allSessionsRef');
            disconnectRef('allStatsRef');
            store.commit(Mutations.CLEAR_SOLVES);

            connectRef('solvesRef', store.getters.solvesRef.orderByChild('sessionId').equalTo(state.sessionId), 'child_added', snapshot => {
                store.commit(Mutations.ADD_SOLVE, Solve.fromSnapshot(snapshot));
            });

            connectRef('solvesRef', store.getters.solvesRef.orderByChild('sessionId').equalTo(state.sessionId), 'child_changed', snapshot => {
                store.commit(Mutations.UPDATE_SOLVE, { uid: snapshot.key, solve: Solve.fromSnapshot(snapshot) });
            });

            connectRef('solvesRef', store.getters.solvesRef.orderByChild('sessionId').equalTo(state.sessionId), 'child_removed', snapshot => {
                store.commit(Mutations.DELETE_SOLVE, snapshot.key);
            });

            connectRef('sessionStatsRef', store.getters.sessionStatsRef, 'value', snapshot => {
                store.commit(Mutations.RECEIVE_SESSION_STATS, snapshot.val());
            });

            connectRef('allSessionsRef', store.getters.sessionsRef, 'value', snapshot => {
                store.commit(Mutations.RECEIVE_ALL_SESSIONS, snapshot.val());
            });

            connectRef('allStatsRef', store.getters.statsRef, 'value', snapshot => {
                store.commit(Mutations.RECEIVE_ALL_STATS, snapshot.val());
            });

            store.dispatch(Actions.REQUEST_SCRAMBLE);
        }
    }),
    store => store.subscribe((mutation, state) => {
        console.log(mutation.type);
        console.log(mutation.payload);
    })
];

try {
    firebase.initializeApp(firebaseConfig.development);
} catch (e) {
    console.error(e);
}

Vue.use(Vuex);
Vue.use(datePicker);

export default new Vuex.Store({
    state,
    getters,
    mutations,
    actions,
    plugins,
    strict: true //TODO: disable this before deploying to production
})