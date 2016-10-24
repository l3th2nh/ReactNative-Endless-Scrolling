### Problem

List view is a common UI element. It is used extensively in web and mobile layouts.

This post will introduce you to the implementation of ListView in React Native.

It also handles two frequent behaviours when users interact with a list view: pull-to-refresh and scrolling.

Here is the animation of this simple app:

![alt text](https://raw.githubusercontent.com/CodeLinkIO/public-assets/master/blog/endless-scrolling.gif "Endless scrolling gif")

This app has 1 endless list of posts, users can scroll to the bottom to load more posts. It shows a loading wheel to indicate the network status. Users can also pull to refresh the content and it will fetch the content of the first page.

### Breakdown

**ListView**

`ListView` already provides 2 properties to trigger scrolling and pulling
gestures:

- `RefreshControl.onRefresh` triggers when users perform a "Pull-to-refresh" gesture. It also has the built-in UI that reveals the loading icon when you pull to list down. We'll use this to load the first page and refresh the list.

- `onEndReached` fires up when the list view scrolls to the last row. We'll use this trigger to fetch the next page and append the new posts to the list.

**Loading Indicator**

`ActivityIndicator` is used to show the loading indicator. We'll show it when the app is waiting for the response from the server, and hide it once new data is fetched.

**API**

I'm using a fake API endpoint to return a list of posts. We need a field for the pagination info and another field for the post records. The payload looks like this:

```javascript
{
  pagination: {
    page: 1,
    perPage: 10,
    pageCount: 10,
    totalCount: 22
  },
  records: [
    { title: 'Title ...', description: 'Description ...' },
    ...
  ]
}
```

`pagination` info should be sufficient to tell you what is the next page, last page etc.

`records` field contains the posts for the current page.

The API returns a Promise object, we use the Flux-Standard-Action convention to handle the request and the payload. This fake API is no different from the real server. The interface is the same for the component or whatever place calling it.

### Implementation

This is the standard React component, we'll start with the `ListView` setup

```javascript
class Posts extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ds: new ListView.DataSource({ rowHasChanged: (r1,r2) => r1 !== r2 })
    }
  }

  _onRefresh() {
    // To-be-implemented
  }

  _onEndReached() {
    // To-be-implemented
  }

  render() {
    return (
      <ListView
        enableEmptySections={ true }
        automaticallyAdjustContentInsets={ false }
        dataSource={ this.state.ds }
        renderRow={ row => this._renderRow(row) }
        refreshControl={
          <RefreshControl
            refreshing={ false }
            onRefresh={ () => this._onRefresh() }
          />
        }
        onEndReached={ () => this._onEndReached() }
      />
    )
  }
}
```

`dataSource` provides the data for the item list.

`renderRow` is the function that renders the view of each item based on the item
data.

`refreshControl` is used to handle pull-to-refresh gesture.

And `onEndReached` triggers when users scroll to the bottom of the list view.

In order to load data from the "server", we'll trigger the API call when the
component first appears, or when users do pull-to-refresh.

```javascript
class Posts extends Component {
  // ...

  _getPostsRequest() {
    // To-be-implemented: show loading
  }

  _getPostsSuccess(result) {
    // To-be-implemented: hide loading and update post list
  }

  _getPostsFailure(error) {
    // To-be-implemented: hide loading (and show error)
  }

  _getPosts(page) {
    this._getPostsRequest()

    API
      .getPosts(page)
      .then(result => this._getPostsSuccess(result))
      .catch(error => this._getPostsFailure(error))
  }

  componentWillMount() {
    this._getPosts(1)
  }

  _onRefresh() {
    this._getPosts(1)
  }

  // ...
}
```

`_getPosts(page)` handles the connection to the API. It receives the API payload and updates the view in according to the request statuses: `Request`, `Success` and `Failure`.

The API call uses standard Promise interface, and then forward the result to each of the handler function.

Next, we'll use the state to manage loading status and list view data.

```javascript
class Posts extends Component {
  // ...

  constructor(props) {
    super(props)

    this.state = {
      pagination: {},
      posts: [],
      ds: new ListView.DataSource({ rowHasChanged: (r1,r2) => r1 !== r2 })
    }
  }

  _getPostsRequest() {
    const pagination = { ...this.state.pagination, loading: true }
    this._update(pagination)
  }

  _getPostsSuccess(result) {
    const pagination = { ...result.pagination, loading: false }
    const posts = pagination.page === 1 ? result.records : [ ...this.state.posts, ...result.records ]

    this._update(pagination, posts)
  }

  _getPostsFailure(error) {
    const pagination = { ...this.state.pagination, loading: false }
    this._update(pagination)
  }

  _update(pagination, posts = null) {
    const loadingItem = {
      type: 'Loading',
      loading: pagination.loading
    }
    const postItems = posts || this.state.posts
    this.setState({
      pagination: pagination,
      posts: posts,
      ds: this.state.ds.cloneWithRows([ ...postItems, loadingItem ])
    })
  }

  _renderRow(row) {
    if (row.type === 'Loading') {
      return <LoadingIndicator loading={ row.loading } />
    } else {
      return (
        <View style={ styles.row }>
          <Text style={ styles.title }>{ row.title }</Text>
          <Text style={ styles.desc }>{ row.description }</Text>
        </View>
      )
    }
  }

  //...
}
```

We use three different fields in the state to manage the list:

```javascript
this.state = {
  pagination: {},
  posts: [],
  ds: new ListView.DataSource({ rowHasChanged: (r1,r2) => r1 !== r2 })
}
```

`ds` is the data source of the list view, we will update it whenever there is new data from the API. The loading indicator is inserted to the bottom of the list, and based on the `pagination.loading` status it will be shown or hidden:

```javascript
  _update(pagination, posts = null) {
    // ...
    this.setState({
      ds: this.state.ds.cloneWithRows([ ...postItems, loadingItem ])
      // ...
    })
  }

  _renderRow(row) {
    if (row.type === 'Loading') {
      return <LoadingIndicator loading={ row.loading } />
    } else {
      // ...
    }
  }
```

And `LoadingIndicator` is just a wrap-up of the built-in `ActivityIndicator` to decide when to show and when to hide the spinning wheel. This is a simple and "pure" component.

```javascript
const LoadingIndicator = ({ loading }) => (
  loading ? (
    <View style={ styles.loading }>
      <ActivityIndicator
        animating={ true }
        style={[ styles.loading ]}
        size="large"
      />
    </View>
  ) : null
)
```

If we are loading the first page, just flush all of the posts and update with
its data. Otherwise just append the posts to the existing list and update.

```javascript

_getPostsSuccess(result) {
  // ...
  pagination.page === 1 ? result.records : [ ...this.state.posts, ...result.records ]
}
```

That's pretty much the essence of the project. As you can see, React Native already provides the necessary utility in the ListView to make the implementation straightforward.

For simplicity, we are using internal state of the component to manage data. It would be nice if we use `redux` to manage the state and move most of non-rendering code to outside of the component. We'll cover it in another blog post ;)
