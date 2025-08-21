import { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Image, FlatList, TouchableOpacity, Modal, Text, TextInput, Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { icons } from "../../constants";
import useAppwrite from "../../lib/useAppwrite";
import { getUserPosts, signOut, updateUserProfile, uploadFile } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";
import { EmptyState, InfoBox, VideoCard } from "../../components";

const Profile = () => {
  const { user, setUser, setIsLogged } = useGlobalContext();
  const { data: posts } = useAppwrite(() => getUserPosts(user.$id));

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [newAvatar, setNewAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const logout = async () => {
    await signOut();
    setUser(null);
    setIsLogged(false);
    router.replace("/sign-in");
  };

  const openEditModal = () => {
    setNewUsername(user?.username || "");
    setNewAvatar(user?.avatar || "");
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
  };

  const pickAvatarImage = async () => {
    try {
      setUploadingAvatar(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpg", "image/jpeg"],
      });

      if (!result.canceled) {
        const file = result.assets[0];
        console.log("Selected avatar file:", file);
        
        // Upload image to Appwrite storage
        const avatarUrl = await uploadFile(file, "image");
        console.log("Avatar uploaded:", avatarUrl);
        
        setNewAvatar(avatarUrl);
        Alert.alert("Success", "Avatar image uploaded successfully!");
      }
    } catch (error) {
      console.error("Error picking avatar:", error);
      Alert.alert("Error", "Failed to upload avatar image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfileChanges = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }
    if (!newAvatar.trim()) {
      Alert.alert("Error", "Avatar cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await updateUserProfile(user.$id, newUsername, newAvatar);
      setUser(updatedUser);
      Alert.alert("Success", "Profile updated successfully!");
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <VideoCard
            title={item.title}
            thumbnail={item.thumbnail}
            video={item.video}
            creator={item.creator.username}
            avatar={item.creator.avatar}
          />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="No Videos Found"
            subtitle="No videos found for this profile"
          />
        )}
        ListHeaderComponent={() => (
          <View className="w-full flex justify-center items-center mt-6 mb-12 px-4">
            <View className="flex w-full items-end mb-10 flex-row justify-between">
              <TouchableOpacity onPress={logout}>
                <Image
                  source={icons.logout}
                  resizeMode="contain"
                  className="w-6 h-6"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={openEditModal} className="ml-4">
                <Image
                  source={icons.menu}
                  resizeMode="contain"
                  className="w-6 h-6"
                />
              </TouchableOpacity>
            </View>

            <View className="w-16 h-16 border border-secondary rounded-lg flex justify-center items-center">
              <Image
                source={{ uri: user?.avatar }}
                className="w-[90%] h-[90%] rounded-lg"
                resizeMode="cover"
              />
            </View>

            <InfoBox
              title={user?.username}
              containerStyles="mt-5"
              titleStyles="text-lg"
            />

            <View className="mt-5 flex flex-row">
              <InfoBox
                title={posts.length || 0}
                subtitle="Posts"
                titleStyles="text-xl"
                containerStyles="mr-10"
              />
              <InfoBox
                title="1.2k"
                subtitle="Followers"
                titleStyles="text-xl"
              />
            </View>

            {/* Edit Profile Modal */}
            <Modal
              visible={editModalVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={closeEditModal}
            >
              <View style={{ 
                flex: 1, 
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 20
              }}>
                <View style={{ 
                  backgroundColor: "#22223b", 
                  padding: 24, 
                  borderRadius: 12, 
                  width: "100%",
                  maxWidth: 350
                }}>
                  <Text style={{ color: "#fff", fontSize: 20, marginBottom: 20, textAlign: "center" }}>
                    Edit Profile
                  </Text>
                  
                  <Text style={{ color: "#fff", marginBottom: 8 }}>Username</Text>
                  <TextInput
                    value={newUsername}
                    onChangeText={setNewUsername}
                    style={{ 
                      backgroundColor: "#fff", 
                      borderRadius: 8, 
                      marginBottom: 16, 
                      padding: 12,
                      fontSize: 16
                    }}
                    placeholder="Enter username"
                    placeholderTextColor="#666"
                  />
                  
                  <Text style={{ color: "#fff", marginBottom: 8 }}>Avatar</Text>
                  
                  {/* Avatar Preview */}
                  <View style={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: 40, 
                    backgroundColor: "#444",
                    marginBottom: 12,
                    alignSelf: "center",
                    overflow: "hidden"
                  }}>
                    {newAvatar ? (
                      <Image
                        source={{ uri: newAvatar }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ 
                        flex: 1, 
                        justifyContent: "center", 
                        alignItems: "center" 
                      }}>
                        <Text style={{ color: "#fff", fontSize: 12 }}>No Image</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Upload Avatar Button */}
                  <TouchableOpacity 
                    onPress={pickAvatarImage}
                    disabled={uploadingAvatar}
                    style={{ 
                      backgroundColor: uploadingAvatar ? "#666" : "#a77df8",
                      paddingVertical: 12,
                      borderRadius: 8,
                      marginBottom: 20
                    }}
                  >
                    <Text style={{ 
                      color: "#fff", 
                      textAlign: "center", 
                      fontWeight: "bold" 
                    }}>
                      {uploadingAvatar ? "Uploading..." : "Upload Avatar Image"}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <TouchableOpacity 
                      onPress={closeEditModal}
                      style={{ 
                        backgroundColor: "#444", 
                        paddingVertical: 12, 
                        paddingHorizontal: 20, 
                        borderRadius: 8,
                        flex: 1,
                        marginRight: 8
                      }}
                    >
                      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={saveProfileChanges} 
                      disabled={saving}
                      style={{ 
                        backgroundColor: saving ? "#666" : "#a77df8", 
                        paddingVertical: 12, 
                        paddingHorizontal: 20, 
                        borderRadius: 8,
                        flex: 1,
                        marginLeft: 8
                      }}
                    >
                      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
                        {saving ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Profile;
