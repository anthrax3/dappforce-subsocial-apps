import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';
import ReactMarkdown from 'react-markdown';
import { Segment, Dropdown, Button, Icon } from 'semantic-ui-react';

import { withCalls, withMulti } from '@polkadot/ui-api/with';
import { Option, AccountId } from '@polkadot/types';

import { getJsonFromIpfs } from './OffchainUtils';
import { PostId, Post, CommentId, PostData, CommentData, Change, SharedPost } from '@dappforce/types/blogs';
import { queryBlogsToProp } from '@polkadot/df-utils/index';
import { UrlHasIdProps } from './utils';
import { withMyAccount, MyAccountProps } from '@polkadot/df-utils/MyAccount';
import { CommentsByPost } from './ViewComment';
import { CreatedBy } from './CreatedBy';
import { MutedSpan } from '@polkadot/df-utils/MutedText';
import { Voter } from './Voter';
import { PostHistoryModal } from './ListsEditHistory';
import { PostVoters, ActiveVoters } from './ListVoters';
import AddressMiniDf from '@polkadot/ui-app/AddressMiniDf';
import { api } from '@polkadot/ui-api';
import { ShareModal } from './ShareModal';

const LIMIT_SUMMARY = 150;

type ViewPostProps = MyAccountProps & {
  preview?: boolean,
  miniPreview?: boolean,
  nameOnly?: boolean,
  withLink?: boolean,
  withCreatedBy?: boolean,
  id: PostId,
  postById?: Option<Post>,
  commentIds?: CommentId[]
};

type PostContent = PostData & {
  summary: string;
}

function ViewPostInternal (props: ViewPostProps) {
  const { postById } = props;

  if (postById === undefined) return <em>Loading...</em>;
  else if (postById.isNone) return <em>Post not found</em>;

  const {
    myAddress,
    preview = false,
    miniPreview = false,
    nameOnly = false,
    withLink = true,
    id,
    withCreatedBy = true
  } = props;

  const post = postById.unwrap();
  const {
    created,
    created: { account },
    comments_count,
    upvotes_count,
    downvotes_count,
    ipfs_hash,
    extension,
    isRegularPost,
    isSharedComment,
    isSharedPost
  } = post;

  const [ content , setContent ] = useState({} as PostContent);
  const [ commentsSection, setCommentsSection ] = useState(false);
  const [ openPostVoters, setOpenPostVoters ] = useState(false);
  const [ activeVoters, setActiveVoters ] = useState(0);

  const [ originalContent, setOriginalContent ] = useState({} as PostContent);
  const [ originalPost, setOriginalPost ] = useState({} as Post);

  const openVoters = (type: ActiveVoters) => {
    setOpenPostVoters(true);
    setActiveVoters(type);
  };

  const makeSummary = (body: string) => (
    body.length > LIMIT_SUMMARY
    ? body.substr(0, LIMIT_SUMMARY) + '...'
    : body
  );

  useEffect(() => {
    if (!ipfs_hash) return;

    getJsonFromIpfs<PostData>(ipfs_hash).then(json => {
      setContent({...json, summary: makeSummary(json.body) });
    }).catch(err => console.log(err));

    if (isSharedPost) {
      const loadSharedPost = async () => {
        const originalPostId = extension.value as PostId;
        const originalPostOpt = await api.query.blogs.postById(originalPostId) as Option<Post>;

        if (originalPostOpt.isSome) {
          const originalPost = originalPostOpt.unwrap();
          setOriginalPost(originalPost);
          const originalContent = await getJsonFromIpfs<PostData>(originalPost.ipfs_hash);
          setOriginalContent({ ...originalContent, summary: makeSummary(originalContent.body) });
        }
      };

      loadSharedPost().catch(err => new Error(err));
    }
  }, [ false ]);

  const isMyStruct = myAddress === account.toString();

  const renderDropDownMenu = () => {

    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    return (<Dropdown icon='ellipsis horizontal'>
      <Dropdown.Menu>
        {isMyStruct && <Link className='item' to={`/blogs/posts/${id.toString()}/edit`}>Edit</Link>}
        <Dropdown.Item text='View edit history' onClick={() => setOpen(true)} />
        {open && <PostHistoryModal id={id} open={open} close={close}/>}
      </Dropdown.Menu>
    </Dropdown>);
  };

  const renderNameOnly = (title: string, id: PostId, consoles?: string) => {
    if (!title || !id) return null;
    return withLink
      ? <Link
        to={`/blogs/posts/${id.toString()}`}
        style={{ marginRight: '.5rem' }}
      >
        {title}
      </Link>
      : <>{title}</>;
  };

  const renderPostCreator = (created: Change, size?: number) => {
    if (!created) return null;
    {/*Add shared post*/}
    const { account, time, block } = created;
    return withCreatedBy && <AddressMiniDf
      value={account}
      isShort={true}
      isPadded={false}
      size={size}
      extraDetails={`${time} at block #${block.toNumber()}`}/>;
  };

  const renderContent = (post: Post, content: PostContent, consoles?: string) => {
    if (!post || !content) return null;

    const { title, image, summary } = content;
    return <>
      <h2>
        {renderNameOnly(title, post.id, consoles)}
        {renderDropDownMenu()}
      </h2>
      {/* TODO create image*/}
      <div style={{ margin: '1rem 0' }}>
        <ReactMarkdown className='DfMd' source={summary} linkTarget='_blank' />
      </div>
      {/* <div style={{ marginTop: '1rem' }}><ShareButtonPost postId={post.id}/></div> */}
    </>;
  };

  const renderActionsPanel = () => {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    return (
    <>
      <Voter struct={post} />
      <div
        className='ui tiny button basic'
        onClick={() => setOpen(true)}>
        <Icon name='share square'/>
        Share
      </div>
      {open && <ShareModal postId={id} open={open} close={close} />}
    </>);
  };

  const renderStatsPanel = () => {
    return (<>
    <div className='DfCountsPreview'>
      <MutedSpan><HashLink to={`#comments-on-post-${id}`} onClick={() => setCommentsSection(!commentsSection)}>
        Comments: <b>{comments_count.toString()}</b></HashLink></MutedSpan>
      <MutedSpan><Link to='#' onClick={() => openVoters(ActiveVoters.Upvote)}>Upvotes: <b>{upvotes_count.toString()}</b></Link></MutedSpan>
      <MutedSpan><Link to='#' onClick={() => openVoters(ActiveVoters.Downvote)}>Downvotes: <b>{downvotes_count.toString()}</b></Link></MutedSpan>
    </div>
    </>);
  };

  const renderRegularMiniPreview = () => {
    return (
    <Segment className='DfPostPreview'>
      {renderPostCreator(created)}
      {renderContent(post, content)}
      {renderStatsPanel()}
    </Segment>);
  };

  const renderRegularPreview = () => {
    return <>
      <Segment className='DfPostPreview'>
      {renderPostCreator(created)}
      {renderContent(post, content)}
      {renderStatsPanel()}
      {renderActionsPanel()}
      {commentsSection && <CommentsByPost postId={post.id} post={post} />}
      {openPostVoters && <PostVoters id={id} active={activeVoters} open={openPostVoters} close={() => setOpenPostVoters(false)}/>}
      </Segment>
    </>;
  };
  
  const renderSharedPreview = () => {
    return <>
      <Segment className='DfPostPreview'>
        {renderPostCreator(created)}
        <div className='DfSharedSummary'>{renderNameOnly(content.summary, id)}</div>
        {/* TODO add body*/}
        <Segment>
          {renderPostCreator(originalPost.created)}
          {renderContent(originalPost, originalContent, 'shared')}
          {/* <div style={{ marginTop: '1rem' }}><ShareButtonPost postId={post.id}/></div> */}
        </Segment>
        {renderStatsPanel()}
        {renderActionsPanel()}
        {commentsSection && <CommentsByPost postId={post.id} post={post} />}
        {openPostVoters && <PostVoters id={id} active={activeVoters} open={openPostVoters} close={() => setOpenPostVoters(false)}/>}
      </Segment>
    </>;
  };

  const renderDetails = (content: PostContent) => {
    const { title, body, image, summary } = content;
    return <>
      <h1 style={{ display: 'flex' }}>
        <span style={{ marginRight: '.5rem' }}>{title}</span>
        {renderDropDownMenu()}
      </h1>
      {withCreatedBy && <CreatedBy created={post.created} />}
      <div style={{ margin: '1rem 0' }}>
        {image && <img src={image} className='DfPostImage' /* add onError handler */ />}
        <ReactMarkdown className='DfMd' source={body} linkTarget='_blank' />
        {/* TODO render tags */}
      </div>
      <Voter struct={post} />
      {/* <ShareButtonPost postId={post.id}/> */}
      <CommentsByPost postId={post.id} post={post} />
    </>;
  };

  const renderSharedDetails = () =>  (renderSharedPreview());

  if (nameOnly) {
    return renderNameOnly(content.title,id)
  } else if (isRegularPost) {
    if (preview) {
      return renderRegularPreview();
    } else if (miniPreview) {
      return renderRegularMiniPreview();
    } else return renderDetails(content);
  } else if (isSharedPost) {
    return preview
      ? renderSharedPreview()
      : renderSharedDetails();
  } else if (isSharedComment) {
    return <div>Shared Comment is not implemented</div>;
  } else {
    return <div>You should not be here!!!</div>;
  }
}

export const ViewPost = withMulti(
  ViewPostInternal,
  withMyAccount,
  withCalls<ViewPostProps>(
    queryBlogsToProp('postById', 'id')
  )
);

export function ViewPostById (props: UrlHasIdProps) {
  const { match: { params: { id } } } = props;
  try {
    return <ViewPost id={new PostId(id)}/>;
  } catch (err) {
    return <em>Invalid post ID: {id}</em>;
  }
}
