/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react'
import { AppRegistry } from 'react-native'
import Posts from './src/Posts'

export default class EndlessScrolling extends Component {
  render() {
    return <Posts />
  }
}

AppRegistry.registerComponent('EndlessScrolling', () => EndlessScrolling)
