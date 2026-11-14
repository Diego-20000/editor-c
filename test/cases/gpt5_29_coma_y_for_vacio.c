#include <stdio.h>
int main() {
    int I, J;
    for (I = 0, J = 5; I < 5; I++, J--);
    printf("%d %d\n", I, J);
}
