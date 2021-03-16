import 'react-native-gesture-handler';

import React, {useState, useEffect} from 'react';

import {
    Button,
    SafeAreaView,
    StyleSheet,
    FlatList,
    Image,
    ScrollView,
    Text,
    TextInput,
    View,
    RefreshControl,
    Alert,
    TouchableOpacity,
    BackHandler,
    Linking
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
import { Colors, Sizes } from './constants';

// Open database instance
const db = openDatabase(
    {
        name: 'alexuser.sqlite3',
        createFromLocation: '~alexuser.db',
    },
    () => { console.log("connect to database"); },
    (error) => { Alert.alert("Datenbankenfehler", error.message )}
);

// Application
const App = () => {
    return (
        <NavigationContainer>
            {/* Use login navigator to check user login. */}
            <LoginNavigator />
        </NavigationContainer>
    )
}

// --- NAVIGATION

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
        
        // Don't show Tabbar in StackNavigators.

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
                activeTintColor: Colors.buttonInactiveColor,
                inactiveTintColor: Colors.buttonInactiveColor,
            }}
        >
            <Tabs.Screen
                name="HomeNavigator"
                component={HomeNavigator}
                options={{
                    title: 'Startseite',
                    tabBarIcon: ({ focused }) => (
                            <Image 
                                source={icons.home}
                                resizeMode="contain"
                                style={{
                                    width: Sizes.tabButtonSize,
                                    height: Sizes.tabButtonSize,
                                    tintColor: focused ? Colors.buttonActiveColor : Colors.buttonInactiveColor
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
                            source={icons.events}
                            resizeMode="contain"
                            style={{
                                width: Sizes.tabButtonSize,
                                height: Sizes.tabButtonSize,
                                tintColor: focused ? Colors.buttonActiveColor : Colors.buttonInactiveColor
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
                options={{ title: 'Startseite'}}
            />
        </HomeStack.Navigator>
    );
}

// --- LOGIN

const LoginScreen = ({ navigation }) => {
    const [loggedIn, setLoggedIn] = useState(true);

    useEffect(() => {
        getData();
    }, [])


    const getId = () => {
        fetch('http://18.198.41.152:8080/getNewID.php?type=user')
            .then((response) => response.json())
            .then((json) => {
                let id = json.personID;

                // Persist in database
                persistUserId(id, 0);
            })
            .catch((error) => {
                console.error(error);
                Alert.alert("Es tut uns leid...", "Es kann zurzeit keine neue ID angefragt werden: \n" + error.message + 
                    "\nProbiere es später erneut!");
            });
    }

    const persistUserId = (id, state) => {
        console.log("persist user id in db");
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
        // Check for id. If id exists, user already logged in.
        db.transaction((tx) => {
            let query = "SELECT * FROM `self`;";
            tx.executeSql(query, [], (_, results) => {
                if (results.rows.length == 0) {
                    setLoggedIn(false);
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
            }, (tx, error) => {
                console.log("LoginScreen.getData (error): " + error);
            });
        });
    }

    return (
        loggedIn ? 
        <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
        }}
        >
            <Image
                source={icons.logo}
                resizeMode='contain'
                style={{
                    width: 50,
                    height: 50
                }}
            />
        </View> :
        <View>
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
                                marginBottom: Sizes.defaultMargin
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
                                marginBottom: Sizes.defaultMargin
                            }}>
                                <Button
                                    onPress={getId}
                                    color={Colors.buttonActiveColor}
                                    title="Einverstanden" />
                            </View>
                            
                            <View>
                                <Button
                                    onPress={() => { BackHandler.exitApp(); }}
                                    color={Colors.buttonActiveColor}
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
            </ScrollView>
        </View>
    );
}

// --- HOME

const HomeScreen = ({ navigation, route }) => {
    const [refreshing, setRefreshing] = useState(true);
    const [testAvailable, setTestAvailable] = useState(false);
    const [numOfInfectedMeetings, setNumOfInfectedMeetings] = useState(null);
    const [numOfInfectedEvents, setNumOfInfectedEvents] = useState(null);
    const [userId] = useState(route.params.user_id);
    const [userState, setUserState] = useState(route.params.state_id);
    const [stateImg, setStateImg] = useState(null);
    const [stateText, setStateText] = useState(null);

    useEffect(() => {
        getData();
        checkIfTestAvailable();

        const unsubscribe = navigation.addListener('focus', () => {
            // onRefresh();
        });

        return unsubscribe;
    }, [navigation]);

    const getData = () => {
        console.log("Fetching data from server...");
        fetch('http://18.198.41.152:8080/getData.php')
            .then((response) => response.json())
            .then((json) => {
                // If data received, update your state.
                calculateState(json.personIds, json.eventIds);
            })
            .catch((error) => {
                console.error(error);
                Alert.alert("Es tut uns leid...", "Beim Laden der Daten vom Server ist ein Fehler aufgetreten:\n" + error.message + 
                    "\nProbiere es später erneut!");
            })
    };

    const onRefresh = () => {
        getData();
        checkIfTestAvailable();
        updateState(userState);
    }

    const checkIfTestAvailable = () => {
        console.log("Fetching test data from server...");
        fetch('http://18.198.41.152:8080/getCheckNegative.php?personid=' + userId + "'")
            .then((response) => response.json())
            .then((json) => {
                console.log("test for uid: " + userId + " available: " + json.message);
                setTestAvailable(JSON.parse(json.message));
            })
            .catch((error) => {
                console.error(error);
            })
    };

    // Calculating chain

    const calculateState = (users, events) => {
        checkIfPositive(users, events);


        // Number of infected meetings.
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

        // Number of infected events.
        db.transaction((tx) => {
            let query = "SELECT COUNT(*) AS `count` FROM `events` WHERE `event_id` IN (" + events.join(',') + ") \
                        AND ROUND((JULIANDAY(DATETIME('now', 'localtime')) - JULIANDAY(`creation_date`))) < 14.0;";
            tx.executeSql(query, [], (tx, results) => {
                let data = results.rows.item(0);
                setNumOfInfectedEvents(data.count);
            }, (tx, error) => {
                console.error("HomeScreen.calculateState (error): " + error);
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

                    // Send my events to the server.
                    sendMyEvents();
                } else {
                    // Check for meetings.
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
                    // Nothing found. You're clean.
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
                    console.log("Send data to server...");
                    
                    let json = []
                    for (let i = 0; i < results.rows.length; i++) {
                        let tmp = {
                            eventid: results.rows.item(i).event_id,
                            timestamp: results.rows.item(i).creation_date
                        };

                        json.push(tmp);
                    }

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
                            Du wurdest in den letzten 2 Tagen negativ getestet.
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
                {testAvailable ?  (renderNegativeTest()) : null}

                <Section 
                    title="Dein aktueller Status"
                    content={
                        stateImg == null || stateText == null ?
                        <View>
                            <Text>
                                Dein aktueller Status kann momentan nicht abgerufen werden. Möglicherweise
                                bist du nicht mit dem Internet verbunden.
                            </Text>
                        </View> :
                        <View>
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
                            {userState == 1 || userState == 2 ?
                                <View style={{
                                    marginTop: Sizes.defaultMargin
                                }}>
                                    <Button
                                        title="Jetzt testen"
                                        color={Colors.buttonActiveColor}
                                        onPress={() => { Linking.openURL('https://www.rki.de') }}
                                    />
                                </View>  : null}
                        </View>
                    }
                />
                <Section
                    title="Info über die letzten 14 Tage"
                    content={
                        numOfInfectedEvents == null || numOfInfectedMeetings == null ? 
                        <View>
                            <Text>
                                Diese Info kann zurzeit nicht angezeigt werden. Möglicherweise bist du
                                nicht mit dem Internet verbunden.
                            </Text>
                        </View> :
                        <View>
                            <Text>Anzahl von infizierten Kontakten: {numOfInfectedMeetings}</Text>
                            <Text>Anzahl an infizierten Events: {numOfInfectedEvents}</Text>
                        </View>
                    }
                />

                <Section 
                    content={
                        <View>
                            <Text
                                style={{
                                    marginBottom: Sizes.defaultMargin
                                }}
                            >
                                Der folgende QR-Code beinhaltet deine einzigartige ID. Diese ID kann
                                von Laboren oder Ärzten gescannt werden, um einen Test mit dieser
                                einzigartigen ID zu versehen. Sie kann nicht von anderen Alex-Apps
                                gescannt werden.{"\n"}
                                Deine einzigartige ID lautet: {userId}.</Text>
                             <View style={{
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <QRCode value={JSON.stringify(userId)} 
                                    size={64} bgColor='#000000' fgColor='#ffffff' />
                            </View>
                        </View>
        
                       
                    }
                />
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
                padding: Sizes.sectionPadding,
                marginLeft: Sizes.sectionMarginHorizontal,
                marginRight: Sizes.sectionMarginHorizontal,
                marginTop: Sizes.sectionMarginVertical,
                marginBottom: Sizes.sectionMarginVertical,
                borderRadius: Sizes.sectionBorderRadius,
                backgroundColor: Colors.white,
                elevation: Sizes.elevation,
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
                        source={icons.qrScreen}
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
                            marginBottom: Sizes.defaultMargin
                        }}>
                            Hier werden dir die Events der letzten 14 Tage angezeigt,
                            an denen du teilgenommen hast.
                        </Text>
                        <Button
                            onPress={addEvent}
                            color={Colors.buttonActiveColor}
                            title="Neues Event erstellen" />
                    </View>
                }
            />

            <FlatList
                data={dataSource}
                keyExtractor={(_, index) => index.toString()}
                enableEmptySections={true}
                renderItem={ItemView}

                ListFooterComponent={
                    <View style={{
                        height: Sizes.endOfViewPadding
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
                    icon: icons.qrScan,
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
            }, (tx, error) => {
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
                                marginBottom: Sizes.defaultMargin
                            }}
                            placeholder="Eventname"
                            underlineColorAndroid={Colors.buttonActiveColor}
                            onChangeText={(text) => { setEventName(text.trim()) }} />
                        <Button 
                            onPress={addEvent}
                            color={Colors.buttonActiveColor}
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
                            marginTop: Sizes.defaultMargin,
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
        try {

            // Check if all needed data is available.
            let data = JSON.parse(e.data);
            if (data.event_id == null || data.event_name == null) {
                throw new Error("unsupported");
            }

            // All data available.
            // Create or update event.
            db.transaction((tx) => {
                let query = "SELECT * FROM `events` WHERE `event_id` = '" + data.event_id + "';";
                tx.executeSql(query, [], (_, results) => {
                    if (results.rows.length > 0) {
                        // Event already exists
                        updateEvent(data);
                    } else {
                        createEvent(data)
                    }
                }, (tx, error) => {
                    console.log("QRScan.onSuccess (error): " + error);
                });
            });
        } catch (error) {
            Alert.alert("Fehler", "Der QR-Code konnte nicht gelesen werden.\nStelle sicher, dass der QR-Code " +
                "von einer anderen Alex-App generiert wurde oder die gleiche Schnittstelle verwendet.");
            navigation.navigate("EventScreen");
        }
    };
    
    const createEvent = (data) => {
        db.transaction((tx) => {
            let query = "INSERT INTO `events` (`event_id`, `event_name`, `creation_date`) VALUES \
                ('" + data.event_id + "', '" + data.event_name + "', DATETIME('now', 'localtime'))";
            tx.executeSql(query, [], (_, results) => {
                Alert.alert("Neues Event hinzugefügt", data.event_name);
                navigation.navigate("EventScreen");
            }, (tx, error) => {
                console.log("QRScan.createEvent (error): " + error);
            });
        });
    }

    const updateEvent = (data) => {
        db.transaction((tx) => {
            let query = "UPDATE `events` SET `creation_date` = DATETIME('now', 'localtime') \
                WHERE `event_id` = '" + data.event_id + "';";
            tx.executeSql(query, [], (_, results) => {
                Alert.alert("Event aktualisiert", data.event_name);
                navigation.navigate("EventScreen");
            }, (tx, error) => {
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
        padding: Sizes.sectionPadding,
        marginLeft: Sizes.sectionMarginHorizontal,
        marginRight: Sizes.sectionMarginHorizontal,
        marginTop: Sizes.sectionMarginVertical,
        marginBottom: Sizes.sectionMarginVertical,
        borderRadius: Sizes.sectionBorderRadius,
        backgroundColor: Colors.white,
        elevation: Sizes.elevation,
    },
    sectionTitle: {
        fontSize: 24,
        marginBottom: Sizes.sectionMarginHorizontal,
    },
    stateImage: {
        width: 160,
        height: 160,
        borderRadius: 30,
        borderTopLeftRadius: 70,
        borderBottomRightRadius: 70,
    },
    stateText: {
        marginTop: Sizes.sectionMarginVertical,
        marginLeft: Sizes.sectionMarginHorizontal, 
        marginRight: Sizes.sectionMarginHorizontal,
        textAlign: 'center',
        fontWeight: 'bold', 
        fontSize: 18
    },
});

export default App;