import React, { Component } from 'react'
import {
  StyleSheet,
  Text,
  ListView,
  RefreshControl,
  ActivityIndicator,
  View
} from 'react-native'
import API from './api'

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

export default class Posts extends Component {
  constructor(props) {
    super(props)

    this.state = {
      pagination: {},
      posts: [],
      ds: new ListView.DataSource({ rowHasChanged: this._rowHasChanged })
    }
  }

  componentWillMount() {
    this._getPosts(1)
  }

  _getPostsRequest() {
    const pagination = { ...this.state.pagination, loading: true }
    this._update(pagination, this.state.posts)
  }

  _getPostsSuccess(result) {
    const pagination = { ...result.pagination, loading: false }
    const posts = pagination.page === 1 ? result.records : [ ...this.state.posts, ...result.records ]

    this._update(pagination, posts)
  }

  _getPostsFailure(error) {
    const pagination = { ...this.state.pagination, loading: false }
    this._update(pagination, this.state.posts)
    console.error(error)
  }

  _getPosts(page) {
    this._getPostsRequest()

    API
      .getPosts(page)
      .then(result => this._getPostsSuccess(result))
      .catch(error => this._getPostsFailure(error))
  }

  _rowHasChanged(r1, r2) {
    return r1 !== r2
  }

  _update(pagination, posts) {
    const loading = {
      type: 'Loading',
      loading: pagination.loading
    }
    this.setState({
      pagination: pagination,
      posts: posts,
      ds: this.state.ds.cloneWithRows([ ...posts, loading ])
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

  _onRefresh() {
    this._getPosts(1)
  }

  _onEndReached() {
    const { pagination } = this.state
    const { page, perPage, pageCount, totalCount } = pagination
    const lastPage = totalCount <= (page - 1) * perPage + pageCount

    if (!pagination.loading && !lastPage) {
      this._getPosts(page + 1)
    }
  }

  render() {
    return (
      <ListView
        style={ styles.container }
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#F5FCFF'
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10
  },
  row: {
    paddingHorizontal: 10,
    paddingVertical: 15
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15
  },
  desc: {
    fontSize: 13
  }
})

