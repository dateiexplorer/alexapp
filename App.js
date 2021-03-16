import 'react-native-gesture-handler';

import React, {useState, useEffect} from 'react';

import {
    Button,
    SafeAreaView,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    Image,
    ScrollView,
    Text,
    TextInput,
    View,
    RefreshControl,
    Alert,
    TouchableOpacity,
    BackHandler
} from 'react-native';

// Navigation
import { getFocusedRouteNameFromRoute, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Database
import { openDatabase } from 'react-native-sqlite-storage';

// QRCodes
import QRCode from 'react-native-qrcode-svg';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera } from 'react-native-camera';

// FloatingButton
import { FloatingAction } from 'react-native-floating-action';

import { images } from './constants';
import { icons } from './constants';

// Open database instance
const db = openDatabase(
    {
        name: 'alexuser.sqlite3',
        createFromLocation: '~alexuser.db',
    },
    () => { console.log("connect successfully to database"); },
    (error) => { Alert.alert("Datenbankenfehler", error.message )}
);

// Application
const App = () => {
    return (
        <NavigationContainer>
            <LoginNavigator />
        </NavigationContainer>
    )
}

const LoginStack = createStackNavigator();

const LoginNavigator = () => {
    return (
        <LoginStack.Navigator
            screenOptions={{
                headerShown: false
            }}
        >
            <LoginStack.Screen
                name="Login"
                component={LoginScreen}
                options={{ title: 'Login' }}
            />
            <LoginStack.Screen
                name="TabNavigator"
                component={TabNavigator}
            />
        </LoginStack.Navigator>
    );
}

const Tabs = createBottomTabNavigator();

const TabNavigator = ({ navigation }) => {
    
    const getTabBarVisibility = (route) => {
        const routeName = getFocusedRouteNameFromRoute(route)
        
        if (routeName === 'QRScan' || routeName === 'QRScreen') {
            return false;
        }

        if (routeName === 'AddNewEvent') {
            return false;
        }
        
        return true;
    }

    return (
        <Tabs.Navigator
            tabBarOptions={{
                activeTintColor: '#333333',
                inactiveTintColor: '#ababab'
            }}
        >
            <Tabs.Screen
                name="HomeNavigator"
                component={HomeNavigator}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                            <Image 
                                source={icons.homeIcon}
                                resizeMode="contain"
                                style={{
                                    width: 25,
                                    height: 25,
                                    tintColor: focused ? '#333333' : '#ababab'
                                }}
                            />
                    ),
                }}
            />
            <Tabs.Screen 
                name="EventNavigator"
                component={EventNavigator}
                options={
                    ({ route }) => ({ 
                        tabBarVisible: getTabBarVisibility(route), 
                        title: 'Events',
                        tabBarIcon: ( {focused} ) => (
                            <Image 
                                source={icons.eventsIcon}
                                resizeMode="contain"
                                style={{
                                    width: 25,
                                    height: 25,
                                    tintColor: focused ? '#333333' : '#ababab'
                                }}
                            />
                        )
                    })
                }
            />
        </Tabs.Navigator>
    );
}

const EventStack = createStackNavigator();

const EventNavigator = () => {
    return (
        <EventStack.Navigator>
            <EventStack.Screen 
                name="EventScreen"
                component={EventScreen}
                options={{ title: 'Events' }}
            />
            <EventStack.Screen
                name="QRScreen"
                component={QRScreen}
                options={{ title: 'QR-Code' }}
            />
            <EventStack.Screen 
                name="QRScan"
                component={QRScan}
                options={{ title: 'Event scannen' }}
            />
            <EventStack.Screen
                name="AddNewEvent"
                component={AddNewEvent}
                options={{ title: "Event erstellen" }} 
            />
        </EventStack.Navigator>
    );
}

const HomeStack = createStackNavigator();

const HomeNavigator = () => {
    return (
        <HomeStack.Navigator
            initialRouteName="HomeScreen"
        >
            <HomeStack.Screen
                name="HomeScreen"
                component={HomeScreen}
                options={{ title: 'Home'}}
            />
        </HomeStack.Navigator>
    );
}

// --- LOGIN

const LoginScreen = ({ navigation }) => {
    const [firstLogin, setFirstLogin] = useState(true);

    useEffect(() => {
        getData();
    }, [])


    const getId = () => {
        console.log("LoginScreen: ask for user id");
        fetch('http://18.198.41.152:8080/getNewID.php?type=user')
            .then((response) => response.json())
            .then((json) => {
                let id = json.personID;

                // Persist in database
                persistUserId(id, 0);
            })
            .catch((error) => {
                console.error(error);
                Alert.alert("Fehler", "Es kann zurzeit keine neue ID angefragt werden: \n" + error.message + 
                    "\nProbiere es später erneut. Die App wird nun geschlossen.",
                [{
                    text: 'Ok',
                    onPress: () => BackHandler.exitApp(),
                }], { cancelable: false });
            });
    }

    const persistUserId = (id, state) => {
        console.log("LoginScreen: persist user id in db");
        db.transaction((tx) => {
            let sql = 'INSERT INTO `self` (`user_id`, `state_id`) VALUES (?, ?);';
            tx.executeSql(sql, [id, state], (tx, results) => {
                // Persisted in database. Route.
                navigation.reset({
                    index: 0,
                    routes: [
                        { name: "TabNavigator", 
                            params: { 
                                screen: "HomeNavigator", 
                                params: {
                                    screen: "HomeScreen",
                                    params: { user_id: id, state_id: state }
                                }
                            }
                        }
                    ]
                });
            }, (tx, error) => {
                console.error("LoginScreen.persistUserId (error): " + error);
            });
        })
    }

    const getData = () => {
        // Get id
        db.transaction((tx) => {
            let query = "SELECT * FROM `self`;";
            tx.executeSql(query, [], (_, results) => {
                if (results.rows.length == 0) {
                    setFirstLogin(true);
                } else {
                    navigation.reset({
                        index: 0,
                        routes: [
                            { name: "TabNavigator", 
                                params: { 
                                    screen: "HomeNavigator", 
                                    params: {
                                        screen: "HomeScreen",
                                        params: results.rows.item(0)
                                    }
                                }
                            }
                        ]
                    });
                }
            }, (_, error) => {
                console.log("LoginScreen.getData (error): " + error);
            });
        });
    }

    return (
        <View>
            {!firstLogin ? <ActivityIndicator /> :
            <ScrollView>
                <Section 
                    content={
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Image 
                                source={images.logo}
                                resizeMode='contain'
                                style={{
                                    width: '80%'
                                }}
                            />
                        </View>
                    }
                />
                
                <Section 
                    title="Willkommen"
                    content={
                        <View>
                            <Text style={{
                                marginBottom: 16
                            }}>
                                Willkommen bei der Alex-App.
                                Diese App hilft dir und deinen Mitmenschen durch die Corona-Pandemie.
                                Dabei ist der Quellcode unter eine Open-Source-Lizenz gestellt, ebenso
                                steht die API für Entwicklungen jedem frei zur Verfügung.
                                {"\n"}
                                Dazu benötigt Alex keine persönlichen Daten von dir. Du erhälst lediglich
                                eine zufällige, einzigartige ID.
                                {"\n\n"}
                                Mit dem Klicken auf 'Einverstanden' bist du damit einverstanden, dass deine
                                persönliche ID nach einem positiv nachgewiesenen Test in einer öffentlichen
                                Datenbank gespeichert wird.
                            </Text>
                            <View style={{
                                marginBottom: 16
                            }}>
                                <Button
                                    onPress={getId}
                                    color='#333333'
                                    title="Einverstanden" />
                            </View>
                            
                            <View>
                                <Button
                                    onPress={() => { BackHandler.exitApp(); }}
                                    color='#333333'
                                    title="App verlassen" />
                            </View>
                        </View>
                    }
                />
                <Section 
                    title="Hinweis"
                    content={
                        <View>
                            <Text>
                                Bei dieser App handelt es sich um eine Simulation. Die App kann in diesem Zustand
                                nicht für den produktiven Einsatz genutzt werden, da zentrale Server eventuell
                                nicht mehr verfügbar sind.
                            </Text>
                        </View>
                    }
                />
            </ScrollView>}
        </View>
    );
}

// --- HOME

const HomeScreen = ({ navigation, route }) => {
    const [refreshing, setRefreshing] = useState(true);
    const [dataSource, setDataSource] = useState([]);
    const [testAvailable, setTestAvailable] = useState(false);
    const [numOfInfectedMeetings, setNumOfInfectedMeetings] = useState(0);
    const [numOfInfectedEvents, setNumOfInfectedEvents] = useState(0);
    const [userId, setUserId] = useState(route.params.user_id);
    const [userState, setUserState] = useState(route.params.state_id);
    const [stateImg, setStateImg] = useState(null);
    const [stateText, setStateText] = useState(null);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            onRefresh();
        });

        return unsubscribe;
    }, [navigation]);

    const getData = () => {
        console.log("Fetching data from server...");
        fetch('http://18.198.41.152:8080/getData.php')
            .then((response) => response.json())
            .then((json) => {
                setDataSource(json);
                console.log(json);

                // If data received, update your state.
                calculateState(json.personIds, json.eventIds);
            })
            .catch((error) => {
                console.error(error);
                Alert.alert("Fehler", "Beim Laden der Daten vom Server ist ein Fehler aufgetreten:\n" + error.message + 
                    "\nProbiere es später erneut!");
            })
    };

    const onRefresh = () => {
        updateState(userState);
        getData();
        checkIfTestAvailable();
    }

    const checkIfTestAvailable = () => {
        console.log("Fetching data from server...");
        fetch('http://18.198.41.152:8080/getCheckNegative.php?personid=' + userId)
            .then((response) => response.json())
            .then((json) => {
                setTestAvailable(JSON.parse(json.message));
                console.log(json.message);
            })
            .catch((error) => {
                console.error(error);
            })
    };

    // Calculating chain

    const calculateState = (users, events) => {
        checkIfPositive(users, events);

        db.transaction((tx) => {
            let query = "SELECT COUNT(*) AS `count` \
                        FROM `meetings` WHERE `person_id` IN (" + users.join(',') + ") \
                        AND ROUND((JULIANDAY(DATETIME('now', 'localtime')) - JULIANDAY(`time_start`))) < 14.0 \
                        AND `time_end` IS NOT NULL;";
            tx.executeSql(query, [], (tx, results) => {
                let data = results.rows.item(0);
                setNumOfInfectedMeetings(data.count);
            }, (tx, error) => {
                console.error("HomeScreen.calculateState (error): " + error);
            });
        });

        db.transaction((tx) => {
            let query = "SELECT COUNT(*) AS `count` FROM `events` WHERE `event_id` IN (" + events.join(',') + ") \
                        AND ROUND((JULIANDAY(DATETIME('now', 'localtime')) - JULIANDAY(`creation_date`))) < 14.0;";
            tx.executeSql(query, [], (tx, results) => {
                let data = results.rows.item(0);
                setNumOfInfectedEvents(data.count);
            }, (tx, error) => {
                console.error("HomeScreen.checkForInfectedEvents (error): " + error);
            });
        });
    }

    const checkIfPositive = (users, events) => {
        db.transaction((tx) => {
            let query = "SELECT * FROM `self` WHERE `user_id` IN (" + users.join(',') + ")";
            tx.executeSql(query, [], (tx, results) => {
                if (results.rows.length > 0) {
                    // You're positive.
                    updateState(3);

                    // Send my events to the list.
                    sendMyEvents();
                } else {
                    // Check for meetings
                    checkForInfectedMeetings(users, events)
                }
            }, (tx, error) => {
                console.error("HomeScreen.checkIfPositive (error): " + error);
            });
        });
    }

    const checkForInfectedMeetings = (users, events) => {
        db.transaction((tx) => {
            let query = "SELECT *, ROUND((JULIANDAY(`time_end`) - JULIANDAY(`time_start`)) * 1440) AS `delta` \
                        FROM `meetings` WHERE `person_id` IN (" + users.join(',') + ") \
                        AND ROUND((JULIANDAY(DATETIME('now', 'localtime')) - JULIANDAY(`time_start`))) < 14.0 \
                        AND `time_end` IS NOT NULL;";
            tx.executeSql(query, [], (tx, results) => {
                // Check for meetings from the past 14 days.
                if (results.rows.length > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        let data = results.rows.item(i).delta;
                        // If you're meeting duration is more than 15min, set higher risk state.
                        if (data >= 15) {
                            updateState(2);
                            return;
                        }
                    }

                    // Else set low risk state.
                    updateState(1);
                } else {
                    // Check for events
                    checkForInfectedEvents(users, events);
                }
            }, (tx, error) => {
                console.error("HomeScreen.checkForInfectedMeetings (error): " + error);
            });
        });
    }

    const checkForInfectedEvents = (users, events) => {
        // Check for events
        db.transaction((tx) => {
            let query = "SELECT * FROM `events` WHERE `event_id` IN (" + events.join(',') + ") \
                        AND ROUND((JULIANDAY(DATETIME('now', 'localtime')) - JULIANDAY(`creation_date`))) < 14.0;";
            tx.executeSql(query, [], (tx, results) => {
                // Check for events from the past 14 days.
                if (results.rows.length > 0) {
                    updateState(1);
                } else {
                    updateState(0);
                }
            }, (tx, error) => {
                console.error("HomeScreen.checkForInfectedEvents (error): " + error);
            });
        });
    }

    const updateState = (state) => {
        db.transaction((tx) => {
            let query = "SELECT * FROM `states` WHERE `state_id` = ?";
            tx.executeSql(query, [state], (tx, results) => {
                console.log("HomeScreen.updateState")

                let text = results.rows.item(0).text;
                setUserState(state);
                setStateImg(images.stateImages[state]);
                setStateText(text);
            }, (tx, error) => {
                console.error("HomeScreen.updateState (error)" + error);
            });

            // Persist state in database.
            query = "UPDATE `self` SET `state_id` = ? WHERE `user_id` = ?";
            tx.executeSql(query, [userState, userId], (tx, results) => {
                setRefreshing(false);
            }, (tx, error) => {
                console.error("HomeScreen.updateState (error)" + error);
            });
        });
    }

    const sendMyEvents = () => {
        db.transaction((tx) => {
            let query = "SELECT `event_id`, `creation_date` FROM 'events' \
                        WHERE ROUND((JULIANDAY(DATETIME('now', 'localtime')) - JULIANDAY(`creation_date`))) < 14.0;";
            tx.executeSql(query, [], (tx, results) => {
                if (results.rows.length > 0) {
                    let json = []
                    for (let i = 0; i < results.rows.length; i++) {
                        let tmp = {
                            eventid: results.rows.item(i).event_id,
                            timestamp: results.rows.item(i).creation_date
                        };

                        json.push(tmp);
                    }

                    console.log(JSON.stringify(json));

                    fetch('http://18.198.41.152:8080/addInfectedEvents.php', {
                        method: "POST",
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(json)
                    }).then((response) => console.log(response))
                        .catch((error) => {
                            console.error(error);
                            Alert.alert("Fehler", "Daten können zurzeit nicht an den Server gesendet werden:\n" + error.message + 
                            "\nProbiere es später erneut!");
                        });
                }
            }, (tx, error) => {
                console.error("HomeScreen.sendMyEvents (error): " + error);            
            });
        });
    }

    function renderNegativeTest() {
        return (
            <Section
                title="Negatives Testergebnis"
                content={
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Image 
                            source={images.stateImages[4]}
                            style={styles.stateImage}
                        />
                        <Text style={styles.stateText}>
                            Du wurdest in den letzten 14 Tagen negativ getestet.
                        </Text>
                    </View>
                }
            />
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }} >
            <ScrollView
                refreshControl={
                    <RefreshControl
                        // Refresh control used for the pull to refresh
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {refreshing ? <ActivityIndicator /> : null}

                {testAvailable ?  (renderNegativeTest()) : null}

                <Section 
                    title="Dein aktueller Status"
                    content={
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Image 
                                source={stateImg}
                                style={styles.stateImage}
                            />
                            <Text style={styles.stateText}>
                                {stateText}
                            </Text>
                        </View>
                    }
                />
                <Section
                    title="Info über die letzten 14 Tage"
                    content={
                        <View>
                            <Text>Anzahl von infizierten Kontakten: {numOfInfectedMeetings}</Text>
                            <Text>Anzahl an infizierten Events: {numOfInfectedEvents}</Text>
                        </View>
                    }
                />

                <View
                    style={{
                        height: 100
                    }}
                />

                <View style={{
                    margin: 12
                }}>
                    <Text>Deine einzigartige ID: {userId}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

// --- EVENTS

const EventScreen = ({ navigation }) => {
    const [refreshing, setRefreshing] = useState(true);
    const [dataSource, setDataSource] = useState([]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            onRefresh();
        });

        return unsubscribe;
    }, [navigation]);

    const getData = () => {
        // Get events from the last 14 days.
        db.transaction((tx) => {
            let query = "SELECT * FROM `events` \
                WHERE ROUND((JULIANDAY(DATE('now')) - JULIANDAY(`creation_date`))) <= 14.0 \
                ORDER BY `creation_date` DESC;";
            tx.executeSql(query, [], (_, results) => {
                let data = [];
                for (let i = 0; i < results.rows.length; i++) {
                    console.log(results.rows.item(i));
                    data.push(results.rows.item(i));
                }

                // Set data source and refresh table.
                setDataSource(data);
                setRefreshing(false);
            }, (_, error) => {
                console.log("EventScreen.getData (error): " + error);
            });
        });
    };

    // One list item.
    const ItemView = ({item}) => {
        return (
            <View style={{
                alignItems: 'center',
                padding: 24,
                marginLeft: 12,
                marginRight: 12,
                marginTop: 8,
                marginBottom: 8,
                borderRadius: 5,
                backgroundColor: '#ffffff',
                elevation: 5,
                flexDirection: 'row',
            }}>
                <Text 
                    style={{
                        fontWeight: 'bold',
                        marginRight: 36
                    }}
                >{item.event_name}</Text>
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        right: 24
                    }}
                    onPress={() => {
                        navigation.navigate('QRScreen', item)
                    }}
                >
                    <Image
                        source={require('./assets/icons/qr-code.png')}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    // Refresh list.
    const onRefresh = () => {
        getData();
    };

    // Add new event.
    const addEvent = () => {
        console.log('add new event');
        navigation.navigate('AddNewEvent');
    }

    // Scan an event.
    const scanEvent = () => {
        navigation.navigate('QRScan')
    }

    return (
        <SafeAreaView style={{flex: 1}}>
            <Section title="Events der letzten 14 Tage"
                content={
                    <View>
                        <Text style={{
                            marginBottom: 16
                        }}>
                            Hier werden dir die Events der letzten 14 Tage angezeigt,
                            an denen du teilgenommen hast.
                        </Text>
                        <Button
                            onPress={addEvent}
                            color='#333333'
                            title="Neues Event erstellen" />
                    </View>
                }
            />

            {refreshing === true ? <ActivityIndicator /> : null}

            <FlatList
                data={dataSource}
                keyExtractor={(_, index) => index.toString()}
                enableEmptySections={true}
                renderItem={ItemView}

                ListFooterComponent={
                    <View style={{
                        height: 100
                    }}/>
                }

                refreshControl={
                    <RefreshControl
                        // Refresh control used for the pull to refresh
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }

            />

            <FloatingAction 
                actions={[{
                    name: "Event scannen",
                    icon: require('./assets/icons/qr-code-scan.png'),
                    position: 0
                }]}
                overrideWithAction={true}
                color='#ededed'
                position='right'
                onPressItem={() => { scanEvent(); }}
            />
        </SafeAreaView>
    );
};

const AddNewEvent = ({ navigation, route }) => {
    const [eventName, setEventName] = useState(null);

    // Add new event.
    const addEvent = () => {

        if (eventName == null || eventName == "") {
            Alert.alert("Fehler", "Bitte gib einen Namen für dein Event ein.");
            return;
        }

        db.transaction((tx) => {
            let query = "INSERT INTO `events` (`event_id`, `event_name`, `creation_date`) VALUES \
                ('" + Date.now() + "', '" + eventName + "', DATETIME('now', 'localtime'))";
            tx.executeSql(query, [], (_, results) => {
                navigation.navigate('EventScreen');
            }, (_, error) => {
                console.log("AddNewEvent.addEvent (error): " + error);
            });
        });
    }

    return (
        <View>
            <Section 
                content={
                    <View>
                        <TextInput
                            style={{
                                marginBottom: 16
                            }}
                            placeholder="Eventname"
                            underlineColorAndroid='#333333'
                            onChangeText={(text) => { setEventName(text.trim()) }} />
                        <Button 
                            onPress={addEvent}
                            color='#333333'
                            title="Erstellen"
                        />
                    </View>
                }
            />
        </View>
    );
}

const QRScreen = ({ navigation, route }) => {
    return (
        <View>
            <Section 
                title="Scanne den QR-Code"
                content={
                    <View>
                        <Text>
                            Lasse den folgenden QR-Code von anderen Personen scannen,
                            die an diesem Event teilnehmen.
                            Wird ein Teilnehmer positiv getestet, werden alle Teilnehmer
                            dieses Events über den Fall informiert.
                        </Text>
                    </View>
                }
            />

            <Section 
                content={
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <QRCode value={JSON.stringify(route.params)} 
                            size={192} bgColor='#000000' fgColor='#ffffff'
                            logo={icons.logo} logoSize={50} />
                        <Text style={{
                            marginTop: 12,
                            textAlign: 'center'
                        }}>{route.params.event_name + "\n" + route.params.creation_date}</Text>
                    </View>
                }
            />
        </View>
    );
}

const QRScan = ({ navigation, route }) => {
    const onSuccess = (e) => {
        let data = JSON.parse(e.data);

        db.transaction((tx) => {
            let query = "SELECT * FROM `events` WHERE `event_id` = '" + data.event_id + "';";
            tx.executeSql(query, [], (_, results) => {
                if (results.rows.length > 0) {
                    // Event already exists
                    updateEvent(data);
                } else {
                    createEvent(data)
                }
            }, (_, error) => {
                console.log("EventScreen.getData (error): " + error);
            });
        });
    };
    
    const createEvent = (data) => {
        db.transaction((tx) => {
            let query = "INSERT INTO `events` (`event_id`, `event_name`, `creation_date`) VALUES \
                ('" + data.event_id + "', '" + data.event_name + "', DATETIME('now', 'localtime'))";
            tx.executeSql(query, [], (_, results) => {
                Alert.alert("New event", data.event_name);
                navigation.navigate("EventScreen");
            }, (_, error) => {
                console.log("QRScan.createEvent (error): " + error);
            });
        });
    }

    const updateEvent = (data) => {
        db.transaction((tx) => {
            let query = "UPDATE `events` SET `creation_date` = DATETIME('now', 'localtime') \
                WHERE `event_id` = '" + data.event_id + "';";
            tx.executeSql(query, [], (_, results) => {
                Alert.alert("Update event", data.event_name);
                navigation.navigate("EventScreen");
            }, (_, error) => {
                console.log("QRScan.updateEvent (error): " + error);
            });
        });
    }

    return (
        <QRCodeScanner
            onRead={onSuccess}
            flashMode={RNCamera.Constants.FlashMode.auto}
        />
    );
}


const Section = (props) => {
    return (
        <View style={styles.section}>
            {props.title ?  <Text style={styles.sectionTitle}>{props.title}</Text> : null }
            {props.content}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        padding: 24,
        marginLeft: 12,
        marginRight: 12,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: 5,
        backgroundColor: '#ffffff',
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 24,
        marginBottom: 12,
    },
    stateImage: {
        width: 160,
        height: 160,
        borderRadius: 30,
        borderTopLeftRadius: 70,
        borderBottomRightRadius: 70,
    },
    stateText: {
        marginTop: 12,
        marginLeft: 12, 
        marginRight: 12,
        textAlign: 'center',
        fontWeight: 'bold', 
        fontSize: 18
    },
});

export default App;