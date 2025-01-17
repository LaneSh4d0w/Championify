import { cl, request, shorthandSkills, trinksCon } from '../helpers';
import progressbar from '../progressbar';
import store from '../store';
import T from '../translate.js';

import default_schema from "../../data/default.json" with { type: "json" };

const skills_map = {
  1: 'Q',
  2: 'W',
  3: 'E',
  4: 'R'
};

export function getVersion() {
  return getCache()
    .then(cache => cache.version)
    .then(version => {
      const split = version.split('.');
      split.pop();
      return split.join('.');
    })
    .then(version => {
      store.set('lolalytics_ver', version);
      return version;
    });
}

function objToItems(title, set_type, obj) {
  let items = Object.keys(obj)
    .map(id => ({
      id,
      count: 1,
      rate: obj[id]
    }))
    .sort((a, b) => a.rate - b.rate);

  return {
    type: `${set_type} ${title}`,
    items: items.reverse().map(item => {
      const { rate, ...rest } = item;
      return rest;
    })
  };
}

function mapSkills(skills) {
  if (!skills) return [];

  const skills_list = Object.keys(skills)
    .map(entry => ({
      skills: entry,
      rate: skills[entry]
    }))
    .sort((a, b) => a.rate - b.rate);

  const mapped_skills = skills_list[skills_list.length - 1].skills.split('').map(entry => skills_map[entry]);

  if (store.get('settings').skillsformat) return shorthandSkills(mapped_skills);
  return mapped_skills;
}

function createJSON(champ, skills, position, blocks, set_type) {
  let title = position;
  if (set_type) title += ` ${set_type}`;
  const riot_json = {
    ...default_schema,
    champion: champ,
    title: `LAS ${store.get('lolalytics_ver')} ${title}`,
    blocks: trinksCon(blocks, skills)
  };

  return {
    champ,
    file_prefix: title.replace(/ /g, '_').toLowerCase(),
    riot_json,
    source: 'lolalytics'
  };
}

function processSets(champ, position, sets) {
  const skills = {
    most_freq: mapSkills(sets.skillpick),
    highest_win: mapSkills(sets.skillwin)
  };

  const mostfreq = {
    starting: objToItems(T.t('starting_items', true), T.t('most_freq', true), sets.startingitempick),
    boots: objToItems(T.t('boots', true), T.t('most_freq', true), sets.bootspick),
    first: objToItems(T.t('first_item', true), T.t('most_freq', true), sets.item1pick),
    second: objToItems(T.t('second_item', true), T.t('most_freq', true), sets.item2pick),
    third: objToItems(T.t('third_item', true), T.t('most_freq', true), sets.item3pick),
    fourth: objToItems(T.t('fourth_item', true), T.t('most_freq', true), sets.item4pick),
    fifth: objToItems(T.t('fifth_item', true), T.t('most_freq', true), sets.item5pick)
  };

  const highestwin = {
    starting: objToItems(T.t('starting_items', true), T.t('highest_win', true), sets.startingitemwin),
    boots: objToItems(T.t('boots', true), T.t('highest_win', true), sets.bootspick),
    first: objToItems(T.t('first_item', true), T.t('highest_win', true), sets.item1win),
    second: objToItems(T.t('second_item', true), T.t('highest_win', true), sets.item2win),
    third: objToItems(T.t('third_item', true), T.t('highest_win', true), sets.item3win),
    fourth: objToItems(T.t('fourth_item', true), T.t('highest_win', true), sets.item4win),
    fifth: objToItems(T.t('fifth_item', true), T.t('highest_win', true), sets.item5win)
  };

  if (store.get('settings').splititems) {
    return [
      createJSON(champ, skills, position, Object.values(mostfreq), T.t('most_freq', true)),
      createJSON(champ, skills, position, Object.values(highestwin), T.t('highest_win', true))
    ];
  }

  return createJSON(champ, skills, position, [
    mostfreq.starting,
    highestwin.starting,
    mostfreq.boots,
    highestwin.boots,
    mostfreq.first,
    highestwin.first,
    mostfreq.second,
    highestwin.second,
    mostfreq.third,
    highestwin.third,
    mostfreq.fourth,
    highestwin.fourth,
    mostfreq.fifth,
    highestwin.fifth
  ]);
}

export function getSr() {
  if (!store.get('lolalytics_ver')) return getVersion().then(getSr);

  return getCache()
    .then(cache => cache.stats)
    .then(stats => {
      return Object.keys(stats).map(champ => {
        cl(`${T.t('processing')} Lolalytics: ${T.t(champ)}`);
        progressbar.incrChamp();

        return Object.keys(stats[champ]).map(position => {
          return processSets(champ, position, stats[champ][position]);
        });
      });
    })
    .then(data => data.flat())
    .then(data => store.push('sr_itemsets', data));
}

export const source_info = {
  name: 'Lolalytics',
  id: 'lolalytics'
};
