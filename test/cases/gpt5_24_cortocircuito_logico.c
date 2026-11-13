#include <stdio.h>
int main() {
    int VECES = 0;
    int R = 1 || ++VECES;
    printf("%d %d\n", R, VECES);
}
