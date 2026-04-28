import Extend from 'flarum/common/extenders';
import BookmarksPage from './components/BookmarksPage';

export default [
  new Extend.Routes()
    .add('postBookmarks', '/bookmarked-posts', BookmarksPage),
];
