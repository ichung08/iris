import { useEffect } from "react";
import { useMutation } from "@apollo/client";
import { utils } from "ethers";
import { create } from "ipfs-http-client";
import { v4 as uuidv4 } from "uuid";
import { CREATE_COMMENT_TYPED_DATA } from "../utils/queries";
import omitDeep from "omit-deep";
import Button from "./Button";
import CommentIcon from "../assets/Comment";

const client = create("https://ipfs.infura.io:5001/api/v0");

function Comment({ wallet, lensHub, profileId, publicationId, stats }) {
    const [createCommentTyped, createCommentTypedData] = useMutation(CREATE_COMMENT_TYPED_DATA);

    const handleClick = async () => {
        const ipfsResult = await client.add(
            JSON.stringify({
                name: "post",
                description: "comment",
                content: "description",
                external_url: null,
                image: null,
                imageMimeType: null,
                version: "1.0.0",
                appId: "iris",
                attributes: [],
                media: [],
                metadata_id: uuidv4(),
            })
        );

        const commentRequest = {
            profileId: profileId,
            publicationId: publicationId,
            contentURI: "ipfs://" + ipfsResult.path,
            collectModule: {
                freeCollectModule: { followerOnly: true },
            },
            referenceModule: {
                followerOnlyReferenceModule: false,
            },
        };

        createCommentTyped({
            variables: {
                request: commentRequest,
            },
        });
    };

    useEffect(() => {
        if (!createCommentTypedData.error) return;

        console.log(createCommentTypedData.error);
    }, [createCommentTypedData.error]);

    useEffect(() => {
        if (!createCommentTypedData.data) return;

        const handleCreate = async () => {
            console.log(createCommentTypedData.data);

            const typedData = createCommentTypedData.data.createCommentTypedData.typedData;
            const { domain, types, value } = typedData;

            const signature = await wallet.signer._signTypedData(
                omitDeep(domain, "__typename"),
                omitDeep(types, "__typename"),
                omitDeep(value, "__typename")
            );

            const { v, r, s } = utils.splitSignature(signature);

            const tx = await lensHub.commentWithSig({
                profileId: typedData.value.profileId,
                contentURI: typedData.value.contentURI,
                profileIdPointed: typedData.value.profileIdPointed,
                pubIdPointed: typedData.value.pubIdPointed,
                collectModule: typedData.value.collectModule,
                collectModuleInitData: typedData.value.collectModuleInitData,
                referenceModule: typedData.value.referenceModule,
                referenceModuleInitData: typedData.value.referenceModuleInitData,
                referenceModuleData: typedData.value.referenceModuleData,
                sig: {
                    v,
                    r,
                    s,
                    deadline: typedData.value.deadline,
                },
            });
            console.log("create comment: tx hash", tx.hash);
        };

        handleCreate();
    }, [createCommentTypedData.data]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px'}}>
            <CommentIcon onClick={handleClick} />
            <p>{ stats.totalAmountOfComments }</p>
        </div>
    );
}

export default Comment;
