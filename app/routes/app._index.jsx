/* eslint-disable react-hooks/exhaustive-deps */
// @ts-nocheck
/* eslint-disable import/no-duplicates */
import { useState, useEffect, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  VerticalStack,
  Tabs,
  LegacyCard,
  Button
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const { shop, accessToken } = session;
  // Below API get theme ID
  const response = await fetch(
    `https://${shop}/admin/api/2023-07/themes.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    }
  );
  const data = await response.json();
  const themeID = data?.themes[0]?.id;
  // Below API Fetch all assets
  const AssetsResponse = await fetch(
    `https://${shop}/admin/api/2023-07/themes/${themeID}/assets.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    }
  );
  const AssetsData = await AssetsResponse.json();
  const filteredItems = AssetsData.assets.filter((item) => {
    return (
      item.key === "templates/collection.json" ||
      item.key === "templates/index.json" ||
      item.key === "templates/product.json"
    );
  });
  return json({ data: filteredItems });
};

export let action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const { shop, accessToken } = session.shop;
  
  const formData = new URLSearchParams(await request.text());
  const { key, theme_id } = formData;
  function getRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012';
    let randomString = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }
  
    return randomString;
  }
  const randomString = getRandomString(10);
  let alternateKey = `layout/alter`+randomString +".json"
  
  const bodyData = {
    asset: {
      key: alternateKey,
      source_key: key,
      update: true,
    },
  };

  try {
    const response = await fetch(
      `https://${shop}/admin/api/2023-07/themes/${theme_id}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify(bodyData),
      }
    );

    if (response.ok) {
      // Asset duplication successful, handle success logic
      return json({ status: "success" });
    } else {
      // Asset duplication failed, handle error logic
      console.error("Asset duplication failed");
      return json({ status: "error" });
    }
  } catch (error) {
    console.error("Error duplicating asset:", error);
    return json({ status: "error" });
  }
};


export default function Index() {
  const { data } = useLoaderData();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const submit = useSubmit();

  const handleSelect = (asset) => {
    setSelectedAsset(asset);
  };

  const handleDuplicate = () => {
    const {key,theme_id} = selectedAsset[0]
    submit({key:key,theme_id:theme_id},
      {method:"PUT"})
     };

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTabIndex(selectedTabIndex),
    []
  );
  const tabs = [
    {
      id: "templates/index.json",
      content: "Home Pages",
      accessibilityLabel: "All customers",
      panelID: "all-customers-content-1",
    },
    {
      id: "templates/collection.json",
      content: "Collection Pages",
      panelID: "accepts-marketing-content-1",
    },
    {
      id: "templates/product.json",
      content: "Product Pages",
      panelID: "repeat-customers-content-1",
    },
  ];

  const renderCard = (assets) => {
    return (
      <LegacyCard>
        {assets
          .filter((asset) => tabs[selectedTabIndex].id === asset.key)
          .map((filteredAsset, index) => (
            <div key={index} style={{padding:"20px"}}>
            <Text >
              <p>Key: {filteredAsset.key}</p>
              <p>Theme ID: {filteredAsset.theme_id}</p>
              <p>Updated At: {filteredAsset.updated_at}</p>
            </Text>
              </div>
          ))}
      </LegacyCard>
    );
  };
  useEffect(() => {
    handleSelect(data);
  }, [renderCard, selectedTabIndex]);

  return (
    <Page>
      <ui-title-bar title="Remix app template"></ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <Tabs
                tabs={tabs}
                selected={selectedTabIndex}
                onSelect={handleTabChange}
              >
                {renderCard(data)}
              </Tabs>
            </LegacyCard>
          </Layout.Section>
        </Layout>
        <form method="put">
          <input
            type="hidden"
            name="selectedAssetKey"
            value={selectedAsset ? selectedAsset.key : ""}
          />
          <input
            type="hidden"
            name="selectedAssetThemeId"
            value={selectedAsset ? selectedAsset.theme_id : ""}
          />
          <Button primary disabled={!selectedAsset} onClick={handleDuplicate}>
            Duplicate Template
          </Button>
        </form>
      </VerticalStack>
    </Page>
  );
}
