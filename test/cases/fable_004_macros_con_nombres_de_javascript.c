#include <stdio.h>
#define constructor 5
#define toString(x) ((x) + 1)
#define __proto__ 7
#define valueOf "texto"
int hasOwnProperty(int length) { return length * 2; }
int main() {
    int prototype = constructor + toString(2) + __proto__;
    printf("%d %d %d %s\n", constructor, toString(2), __proto__, valueOf);
    printf("%d %d\n", prototype, hasOwnProperty(prototype));
    return 0;
}
