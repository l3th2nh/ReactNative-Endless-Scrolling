## Problem
List view is a common UI element. It is used extensively in web layouts and mobile applications. It allows users to scroll to look for more information. 

Facebook's News Feed is probably the most well-known list view, users spend enormous amount of time scrolling and fetching for more interesting stories. 

This post will introduce you to the implementation of ListView in React Native. It also handles two frequent user behaviours when they interact with a list view: pull-to-refresh and (endless) scrolling. 

Here is the animation of this simple ListView: 

![alt text](https://raw.githubusercontent.com/CodeLinkIO/public-assets/master/blog/endless-scrolling.gif "Endless scrolling gif")

This demo app has 1 end-less list of posts, users can scroll to the bottom to load more posts. It shows the loading wheel to indicate the loading status. Users can also pull to refresh the content and it will refresh to the first page.

## Breakdown
**ListView**

`ListView` already provides 2 properties to trigger scrolling and pulling
behaviors:
- `RefreshControl.onRefresh` triggers when users perform a "Pull-to-refresh" gesture. It also has the built-in UI that reveals the loading icon when you pull to list down. We'll use this to load the first page and refresh the list. 
- `onEndReached` fires up when the list view scrolls to the last row. We'll use this trigger to fetch the next page and append the new posts to the list. 
- `ActivityIndicator` is used to show the loading indicator. We'll show it when the app is waiting for the response from the server, and hide it once new data is fetched. 

**API**

I'm using a fake API endpoint to return a list of posts. We need 1 field for the pagination info and another field for the post records. The payload looks like this:
```
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

`pagination` info should be sufficient to tell you what is the next page, last
page etc.

`records` field contains the posts for the current page.

The API returns a Promise object, we use the Flux-Standard-Action convention to handle the request and the payload. This fake API is no different from the real server. The interface is the same for the component or whatever place calling it.

## Implementation

This is the standard React component, we'll start with the `ListView` setup
```
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
When the component is mounted, and when users pull to refresh, we want to load
the first page from the API, we'll go ahead and connect with API

```
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
It starts with `_getPosts(page)`, this is where the app calls to server to fetch data. 
```
_getPosts(page) {
  this._getPostsRequest()
  API
    .getPosts(page)
    .then(result => this._getPostsSuccess(result))
    .catch(error => this._getPostsFailure(error))
}
```
The app needs to update the view accordingly to the request status: `Request`, `Success` and `Failure`. 

The API call uses standard Promise interface, and then forward the result to each of the handler function. 

Next, we'll use the state to manage loading status and list view data.
```
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
That's a lot of code, let's stop and see what it is doing. 

We use three different fields in the state to manage the list: 
```
this.state = {
  pagination: {},
  posts: [],
  ds: new ListView.DataSource({ rowHasChanged: (r1,r2) => r1 !== r2 })
}
```
`ds` is the data source of the list view, we will update it whenever there is new data from the API. The loading indicator is inserted to the bottom of the list, and based on the `pagination.loading` status it will be shown or hidden:
```
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
```
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

```
_getPostsSuccess(result) {
  // ...
  pagination.page === 1 ? result.records : [ ...this.state.posts, ...result.records ]
}
```

That's pretty much the essense of the project. As you can see, React Native already provides the necessary utility to make the implementation straightforward.

For simplicity, we are using internal state of the component to manage data. It would be nice if we use `redux` to manage the state and move most of non-rendering code to outside of the component. We'll cover it in another blog post ;) 
