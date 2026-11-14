#include <stdio.h>
int main() {
    int X = 5;
    int R = X > 0 ? (X % 2 == 0 ? X << 1 : X >> 1) : 0;
    printf("%d %d\n", X << 1, R);
}
