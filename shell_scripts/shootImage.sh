#sudo raspistill -o /imgs/now.jpg -w 1300 -h 780 -tl 10000 -t 100000

#create a folder for each day
BASEFOLDER="/imgs"
HISTORYFOLDER="$BASEFOLDER/history"
FOLDER="$HISTORYFOLDER/$(date +%m%m%y)"

#make folder(s) if it doesn't exist
if ! test -d $BASEFOLDER ; then sudo mkdir $BASEFOLDER ; fi
if ! test -d $HISTORYFOLDER ; then sudo mkdir $HISTORYFOLDER ; fi
if ! test -d $FOLDER ; then sudo mkdir $FOLDER ; fi

#archive old image
if ! test -d $BASEFOLDER/now.jpg ; 
	then sudo cp $BASEFOLDER/now.jpg $FOLDER/img$(date +%H%M%S).jpg ;
fi

#shoot image
sudo raspistill -o $BASEFOLDER/now.jpg -w 1300 -h 780

#create a small version of the file (width 400 x height accordingly)
sudo convert $BASEFOLDER/now.jpg -resize 400 $BASEFOLDER/small.jpg