import React from 'react';
import PropTypes from 'prop-types';
import { View, ScrollView, Platform, AsyncStorage } from 'react-native';
import {
  Container, Header, Footer, Content, Card, CardItem, Thumbnail, Text, Button, Icon,
  Left, Label, Body, Right, Title, Form, Input, Item, Spinner, List
} from 'native-base';
import { Font, AppLoading } from "expo";

import Post from '../components/Post';
import Comment from '../components/Comment';
import NoData from '../components/NoData';
import ContentBar from '../components/ContentBar';
import api from '../ApiClient';

export default class CommentsView extends React.Component {

  static navigationOptions = ({ navigation }) => {
    var postData = navigation.getParam('postData')
    if (postData) {
      if (postData.author)
        title = `Comments on ${postData.author.firstName}'s post`;
      else
        title = "Comments"
    }

    return {
      title,
      headerTintColor: '#FFFFFF',
      headerStyle: {
        backgroundColor: '#fc4970',
      },
    };
  };

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      postData: {},
    }
  }

  async componentWillMount() {
    await Font.loadAsync({
      Roboto: require("native-base/Fonts/Roboto.ttf"),
      Roboto_medium: require("native-base/Fonts/Roboto_medium.ttf")
    });

    await this.loadData();

    this.setState({ loading: false });
  }

  async loadData() {

    // This post data is used initally, but we save our own version in state so it can update
    const postData = this.props.navigation.getParam('postData');

    var postUri = `/posts/${postData._id}`;
    var commentsUri = `/posts/${postData._id}/comments`;

    await api.get(postUri)
      .then(response => {
        this.setState({ postData: response });
      })
      .catch(err => {
        console.error(err);
      });
  }

  /**
   * TODO This is completely replicated logic from Feed's updatePost,
   * should be reused from somehwere else
   */
  updatePost = async (postId, data, type) => {

    const {
      navigation,
    } = this.props;

    const userId = navigation.getParam('userId');
    const reloadParent = navigation.getParam('reloadParent');

    AsyncStorage.getItem('@Skybunk:token')
      .then(value => {

        if (type === 'toggleLike') {

          if (data.usersLiked.includes(userId)) {
            data.likes--;
            data.usersLiked = _.filter(data.usersLiked, user => user !== userId);
          } else {
            data.likes++;
            data.usersLiked.push(userId);
          }
        }

        if (data.likes < 0) data.likes = 0;

        api.put(`/posts/${postId}`, { 'Authorization': 'Bearer ' + value }, data)
          .then(() => {
            this.loadData();
            reloadParent();
          })
          .catch(err => {
            alert("Error updating post");
          });
      })
      .catch(error => {
        this.props.navigation.navigate('Auth');
      });
  }

  addComment = (data) => {
    const {
      navigation,
    } = this.props;

    var reloadParent = navigation.getParam('reloadParent');
    var postData = navigation.getParam('postData');
    var userId = navigation.getParam('userId');

    AsyncStorage.getItem('@Skybunk:token')
      .then(value => {
        var commentContent = {
          author: userId,
          content: data,
        }

        api.post(`/posts/${postData._id}/comment`, { 'Authorization': 'Bearer ' + value }, commentContent)
          .then(() => {
            this.loadData();
            reloadParent();
          });
      })
      .catch(error => {
        console.error(error);
        this.props.navigation.navigate('Auth');
      });
  }

  render() {
    const {
      loading,
      postData,
    } = this.state;

    var comments = postData.comments;
    
    if (loading) {
      return (
        <Container>
          <Content>
            <Spinner color='#cd8500' />
          </Content>
        </Container>
      );
    } else {
      return (
        <Container>
          <Content>
            <Post
              data={postData}
              maxLines={1000}
              updatePost={this.updatePost}
            />
            <ScrollView>
              {comments.length ?
                <List>
                  {
                    _.map(_.orderBy(comments, comment => comment.createdAt.valueOf()),
                      (comment, key) => {
                        return (
                          <Comment
                            key={`comment${key}`}
                            data={comment}
                          />
                        )
                      })
                  }
                </List> :
                <Text style={{
                  flex: 1,
                  flexDirection: "row",
                  fontSize: 18,
                  fontStyle: 'italic',
                  marginTop: 20,
                  marginBottom: 20,
                  textAlign: 'center'
                }}>
                  No comments yet - You could be the first!
                </Text>
              }
            </ScrollView>
          </Content>
          <Footer>
            <ContentBar
              addResource={this.addComment}
            />
          </Footer>
        </Container>
      )
    }
  }
}